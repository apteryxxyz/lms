import { container } from 'maclary';
import schedule, { Job } from 'node-schedule';
import { EventEmitter } from 'node:events';
import Database from './Database';
import Client from './scraper/Client';
import Forums, { Forum } from './scraper/uponline/Forums';
import Messages, { Category } from './scraper/uponline/Messages';
import type { Thread } from './scraper/uponline/Threads';
import type Threads from './scraper/uponline/Threads';
const CronExpression = '0,20,40 9-21 * * 1-6';

export const Events = {
    GroupMessageCreate: 'groupMessageCreate',
    ThreadCreate: 'threadCreate',
};

export type ThreadWithForum = Thread & { forum?: Forum };

export default class Scraper extends EventEmitter {
    /** The scrapers client */
    public client?: Client;
    /** The node-schedule cron job */
    public job?: Job;
    /** The debug interval timer */
    public debug?: NodeJS.Timer;

    /** The forums to watch for new threads on */
    public get forumsToWatch(): Forum[] {
        return Forums.List;
    }

    /** Setup the cron job */
    public async setup(): Promise<void> {
        this.job = schedule.scheduleJob(CronExpression, () => this.process());
        container.logger.info('Scheduled scraper job');
    }

    /** Start the client */
    public async start(): Promise<void> {
        this.client = new Client();
        await this.client.initialise();
        if (process.env.NODE_ENV === 'development')
            // When in development, take a screenshot every 3 seconds
            this.debug = setInterval(() => this.client?.debug(), 3000);
        await this.client.uponline?.login();
        await this.client.uponline?.messages.setup();
        await this.client.wait(3000);
    }

    /** Stop the client */
    public async stop(): Promise<void> {
        clearInterval(this.debug);
        this.client?.browser.close();
        this.client = undefined;
    }

    /** Do all tasks */
    public async process(): Promise<void> {
        await this.start();
        this.client?.log('Checking for new messages...');
        await this.checkMessages();
        this.client?.log('Checking for new threads...');
        await this.checkForums();
        this.client?.log('Done');
        await this.stop();
    }

    /** Check for new LMS messages */
    public async checkMessages(): Promise<void> {
        const messages = this.client?.uponline?.messages as Messages;

        // Open category
        await messages.openCategory(Category.GroupMessages);
        const groups = await messages.listGroups();
        const group = groups.find((g) => g.title.includes('Software'));
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
        const newThreads = [];
        for (const forum of this.forumsToWatch)
            newThreads.push(...(await this.getNewForumThreads(forum)));

        // Sort threads by date
        const fn = (a: any, b: any) => a.sentAt - b.sentAt;
        const sortedThreads = newThreads.sort(fn);

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
