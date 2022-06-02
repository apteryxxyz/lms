import { container } from 'maclary';
import { scheduleJob, Job } from 'node-schedule';
import { EventEmitter } from 'node:events';
import Database from './Database';
import Scraper from '@lib/scraper/Scraper';
import Messages, { Category } from '@lib/scraper/uponline/Messages';
import Forums, { Forum } from '@lib/scraper/uponline/Forums';
import type Threads from '@lib/scraper/uponline/Threads';
import type { Thread } from '@lib/scraper/uponline/Threads';
const CronExpression = '0,20,40 8-22 * * 1-6';

export const Events = {
    GroupMessageCreate: 'groupMessageCreate',
    ThreadCreate: 'threadCreate',
};

export type ThreadWithForum = Thread & { forum: Forum };

export default class ScraperClient extends EventEmitter {
    /** The scrapers client */
    public client?: Scraper;
    /** The node-schedule cron job */
    public job?: Job;
    /** The debug interval timer */
    public debug?: NodeJS.Timer;

    /** The forums to watch for new threads on */
    public get forumsToWatch(): Forum[] {
        return Forums.List;
    }

    /** Setup the cron job */
    public setup(): void {
        this.job = scheduleJob(CronExpression, () => this.process());
        container.logger.info('Scheduled scraper job');
    }

    /** Start the client */
    public async start(): Promise<void> {
        this.client = new Scraper();
        await this.client.initialise();
        await this.client.uponline?.login();
        await this.client.uponline?.messages.setup();
        await this.client.page.waitForTimeout(3000);
    }

    /** Stop the client */
    public async stop(): Promise<void> {
        clearInterval(this.debug);
        this.client?.log('Closing browser');
        await this.client?.browser.close();
        this.client = undefined;
    }

    /** Do all tasks */
    public async process(): Promise<void> {
        await this.start();
        try {
            this.client?.log('Checking for new messages...');
            await this.checkMessages();
            this.client?.log('Checking for new threads...');
            await this.checkForums();
            this.client?.log('Finished process');
        } catch (error) {
            await this.stop();
            throw error;
        }
        await this.stop();
    }

    /** Check for new LMS messages */
    public async checkMessages(): Promise<void> {
        const messages = this.client?.uponline?.messages as Messages;

        const defaultGroups = await messages.listGroups();
        let group = defaultGroups.find((g) => g.title.includes('Software'));
        if (!group) {
            // Open category if not already open
            await messages.openCategory(Category.GroupMessages);
            const groups = await messages.listGroups();
            group = groups.find((g) => g.title.includes('Software'));
        }

        if (!group) throw new Error('Group not found');
        await messages.openGroup(group);

        // Filter the messages in the group by if they are new
        const gmMessages = await messages.listGroupMessages();
        const dbMessages = await Database.getMessages(group);
        const newMessages = gmMessages.filter((msg) => {
            const fn = (m: any) =>
                m.author === msg.author && m.content === msg.content;
            return !dbMessages.find(fn);
        });

        await messages.closeGroup();
        if (!newMessages.length) return void 0;
        messages.log(`New messages in ${group.title}: ${newMessages.length}`);
        await Database.saveMessages(group, gmMessages);

        // Send the events for each new message
        for (const message of newMessages) {
            const handlers = this.listeners(Events.GroupMessageCreate);
            for (const listener of handlers) await listener(group, message);
        }
    }

    /** Check the forums for new threads */
    public async checkForums(): Promise<void> {
        // Set ignoreReset to true, this will ignore the
        // handler resets and make this process a lot faster
        Reflect.set(this.client?.uponline ?? {}, 'ignoreReset', true);

        const newThreads = [];
        for (const forum of this.forumsToWatch)
            newThreads.push(...(await this.getNewForumThreads(forum)));

        // Sort threads by date
        const fn = (a: any, b: any) => a.sentAt - b.sentAt;
        const sortedThreads = newThreads.sort(fn);
        Reflect.set(this.client?.uponline ?? {}, 'ignoreReset', false);

        // Send the events for each new thread
        for (const thread of sortedThreads) {
            const handlers = this.listeners(Events.ThreadCreate);
            for (const listener of handlers)
                await listener(thread.forum, thread);
        }
    }

    /** Get all the new threads within a forum */
    private async getNewForumThreads(forum: Forum): Promise<ThreadWithForum[]> {
        const forums = this.client?.uponline?.forums as Forums;
        const threads = this.client?.uponline?.threads as Threads;

        // Open the forums page
        await forums.goToForum(forum);

        // Filter threads by new ones
        const partialThreads = await forums.listThreads();
        const dbThreads = await Database.getForumThreads(forum);
        const newThreads = partialThreads.filter((thread) => {
            const fn = (t: any) => t.title === thread.title;
            return !dbThreads.find(fn);
        });

        if (!newThreads.length) return [];
        forums.log(`New threads in ${forum.name}: ${newThreads.length}`);
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
