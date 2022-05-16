import fs from 'fs-extra';
import type { Forum, PartialThread } from './scraper/uponline/Forums';
import type { Group, Message } from './scraper/uponline/Messages';
import type { Thread } from './scraper/uponline/Threads';

async function readFile(path: string, def: string): Promise<string> {
    path = path.replace(/=/g, '');
    await fs.ensureFile(path);
    return fs.readFile(path, 'utf8').then((d) => d || def);
}

async function writeFile(path: string, data: string): Promise<void> {
    path = path.replace(/=/g, '');
    await fs.ensureFile(path);
    await fs.writeFile(path, data);
}

export default class Database extends null {
    /** Get the last saved messages cache for a group */
    static async getMessages(group: Group): Promise<Message[]> {
        const path = `cache/messages/${btoa(group.title)}.json`;
        const content = await readFile(path, '[]');
        const json = JSON.parse(content);
        return json;
    }

    /** Save the messages of a group in the cache */
    static async saveMessages(
        group: Group,
        messages: Message[],
    ): Promise<void> {
        const path = `cache/messages/${btoa(group.title)}.json`;
        const content = JSON.stringify(messages, null, 4);
        await writeFile(path, content);
    }

    /** Get the last saved threads list for a forum */
    static async getForumThreads(forum: Forum): Promise<PartialThread[]> {
        const path = `cache/forums/${btoa(forum.id)}.json`;
        const content = await readFile(path, '[]');
        const json = JSON.parse(content);
        return json;
    }

    /** Save the partial threads of a forum in cache */
    static async saveForumThreads(
        forum: Forum,
        threads: PartialThread[],
    ): Promise<void> {
        const path = `cache/forums/${btoa(forum.id)}.json`;
        const content = JSON.stringify(threads, null, 4);
        await writeFile(path, content);
    }

    /** Get the last saved thread content for a thread */
    static async getThreadContent(thread: PartialThread): Promise<Thread> {
        const path = `cache/threads/${btoa(thread.id)}.json`;
        const content = await readFile(path, '[]');
        const json = JSON.parse(content);
        return json;
    }

    /** Save a thread */
    static async saveThreadContent(thread: Thread): Promise<void> {
        const path = `cache/threads/${btoa(thread.id)}.json`;
        const content = JSON.stringify(thread, null, 4);
        await writeFile(path, content);
    }
}
