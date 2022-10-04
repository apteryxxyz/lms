import fs from 'fs-extra';
import type { Forum, PartialThread } from './uponline/Forums';
import type { Group, Message } from './uponline/Messages';
import type { Thread } from './uponline/Threads';
import type { Topic } from './uponline/Topics';

async function readFile(path: string, def: string): Promise<string> {
    path = path.replace(/=/g, '');
    await fs.ensureFile(path);
    return fs.readFile(path, 'utf8').then(d => d || def);
}

async function writeFile(path: string, data: string): Promise<void> {
    path = path.replace(/=/g, '');
    await fs.ensureFile(path);
    await fs.writeFile(path, data);
}

export default class Database extends null {
    /** Get the last saved messages cache for a group */
    public static async getMessages(group: Group): Promise<Message[]> {
        const path = `cache/messages/${btoa(group.name)}.json`;
        const content = await readFile(path, '[]');
        return JSON.parse(content);
    }

    /** Save the messages of a group in the cache */
    public static async saveMessages(group: Group, messages: Message[]): Promise<void> {
        const path = `cache/messages/${btoa(group.name)}.json`;
        const content = JSON.stringify(messages, null, 4);
        await writeFile(path, content);
    }

    /** Get the last saved threads list for a forum */
    public static async getForumThreads(forum: Forum): Promise<PartialThread[]> {
        const path = `cache/forums/${btoa(forum.id)}.json`;
        const content = await readFile(path, '[]');
        return JSON.parse(content);
    }

    /** Save the partial threads of a forum in cache */
    public static async saveForumThreads(forum: Forum, threads: PartialThread[]): Promise<void> {
        const path = `cache/forums/${btoa(forum.id)}.json`;
        const content = JSON.stringify(threads, null, 4);
        await writeFile(path, content);
    }

    /** Get the last saved thread content for a thread */
    public static async getThreadContent(thread: PartialThread): Promise<Thread> {
        const path = `cache/threads/${btoa(thread.id)}.json`;
        const content = await readFile(path, '[]');
        return JSON.parse(content);
    }

    /** Save a thread */
    public static async saveThreadContent(thread: Thread): Promise<void> {
        const path = `cache/threads/${btoa(thread.id)}.json`;
        const content = JSON.stringify(thread, null, 4);
        await writeFile(path, content);
    }

    /** Get the last saved topic content */
    public static async getModuleTopic(index: string): Promise<Topic> {
        const path = `cache/topics/${btoa(index)}.json`;
        const content = await readFile(path, '[]');
        return JSON.parse(content);
    }

    /** Get all topic data */
    public static async getAllModuleTopics(): Promise<Topic[]> {
        const items = fs.readdirSync('cache/topics');
        const topics: Topic[] = [];
        for (const item of items) {
            const path = `cache/topics/${item}`;
            const content = await readFile(path, '[]');
            topics.push(JSON.parse(content));
        }
        return topics;
    }

    /** Save a topic */
    public static async saveModuleTopic(topic: Topic): Promise<void> {
        const path = `cache/topics/${btoa(topic.index)}.json`;
        const content = JSON.stringify(topic, null, 4);
        await writeFile(path, content);
    }
}
