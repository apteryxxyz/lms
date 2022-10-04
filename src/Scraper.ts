import EventEmitter from 'node:events';
import { scheduleJob, Job } from 'node-schedule';
import { container } from 'maclary';

import Client from '@scraper/Client';
import type Messages from '@scraper/uponline/Messages';
import Database from '@scraper/Database';
import type { Forum } from '@scraper/uponline/Forums';
import type Forums from '@scraper/uponline/Forums';
import type { Thread } from '@scraper/uponline/Threads';
import type Threads from '@scraper/uponline/Threads';
import type Modules from '@scraper/uponline/Modules';
import type Topics from '@scraper/uponline/Topics';
const CronExpression = '0,20,40 8-22 * * 1-6';

export const Events = {
    GroupMessageCreate: 'groupMessageCreate',
    ThreadCreate: 'threadCreate',
};

export default class Scraper extends EventEmitter {
    /** The scrapers client */
    public client?: Client;
    /** The node-schedule cron job */
    public job?: Job;
    /** The debug interval timer */
    public debug?: NodeJS.Timer;

    public setup(): void {
        this.job = scheduleJob(CronExpression, () => this.process());
        container.logger.info('Scheduled scraper job');
    }

    /** Start the client */
    public async start(): Promise<void> {
        this.client = new Client();
        await this.client.initialise();
        await this.client.uponline?.login();
        await this.client.page.waitForTimeout(3000);
    }

    /** Stop the client */
    public async stop(): Promise<void> {
        clearInterval(this.debug);
        this.client?.log('Closing browser');
        await this.client?.browser.close();
        this.client = undefined;
    }

    /** Run all the tasks */
    public async process(): Promise<void> {
        await this.start();
        try {
            this.client?.log('Checking for new threads...');
            await this.checkForums();
            this.client?.log('Checking for new messages...');
            await this.checkMessages();
            this.client?.log('Finished process');
        } catch (error: any) {
            await this.client?.debug(error.message.replaceAll(' ', '_'));
            await this.stop();
            console.error(error);
        }
        await this.stop();
    }

    public async checkModuleTopics(): Promise<void> {
        const modules = this.client?.uponline?.modules as Modules;
        const topics = this.client?.uponline?.topics as Topics;

        const moduleList = await modules.getModuleList();
        const topicObjects = [];

        for (const mod of moduleList) {
            await modules.toggleModule(mod);
            const topicList = await topics.getTopicList();
            topicObjects.push(...topicList);
        }

        await Promise.all(topicObjects.map(t => Database.saveModuleTopic(t)));
    }

    /** Check for new messages in the LMS */
    public async checkMessages(): Promise<void> {
        const messages = this.client?.uponline?.messages as Messages;

        const categoryList = await messages.getCategoryList();
        await messages.toggleCategory(categoryList[1]);
        const groupsList = await messages.getGroupList();
        const group = groupsList.find(g => g.name.includes('Software'));
        if (!group) throw new Error('Could not find the Software group');
        await messages.toggleGroup(group);

        // Filter the messages in the group by if they are new
        const gmMessages = await messages.getMessageList();
        const dmMessages = await Database.getMessages(group);
        const newMessages = gmMessages.filter(msg => {
            const fn = (m: any) => m.author === msg.author && m.content === msg.content;
            return !dmMessages.find(fn);
        });

        await messages.toggleGroup();
        await messages.togglePanel(false);

        if (!newMessages.length) return;
        messages.log(`${newMessages.length} new messages in ${group.name}`);
        await Database.saveMessages(group, gmMessages);

        // Send the events for each new message
        for (const msg of newMessages) {
            const handlers = this.listeners(Events.GroupMessageCreate);
            for (const listener of handlers) await listener(group, msg);
        }
    }

    public async checkForums(): Promise<void> {
        const newThreads = [];
        const list = this.client?.uponline?.forums.list as Forum[];
        for (const forum of list) {
            const threads = await this.getNewForumThreads(forum);
            newThreads.push(...threads);
        }

        // Sort threads by date
        const fn = (a: any, b: any) => a.sentAt - b.sentAt;
        const sortedThreads = newThreads.sort(fn);

        // Send the events for each new thread
        for (const thread of sortedThreads) {
            const handlers = this.listeners(Events.ThreadCreate);
            for (const listener of handlers) await listener(thread.forum, thread);
        }
    }

    private async getNewForumThreads(forum: Forum): Promise<(Thread & { forum: Forum })[]> {
        const forums = this.client?.uponline?.forums as Forums;
        const threads = this.client?.uponline?.threads as Threads;

        await forums.goToForum(forum);

        const partialThreads = await forums.listThreads();
        const dbThreads = await Database.getForumThreads(forum);
        const newThreads = partialThreads.filter(thread => {
            const fn = (t: any) => t.title === thread.title;
            return !dbThreads.find(fn);
        });

        if (!newThreads.length) return [];
        forums.log(`${newThreads.length} new threads in ${forum.name}`);
        await Database.saveForumThreads(forum, partialThreads);

        // Go to each new thread and get its content
        const fullThreads = [];
        for (const partialThread of newThreads) {
            await threads.goToThread(partialThread);
            const thread = await threads.getThreadContent();
            await Database.saveThreadContent(thread);
            fullThreads.push({ ...thread, forum });
        }

        return fullThreads;
    }
}
