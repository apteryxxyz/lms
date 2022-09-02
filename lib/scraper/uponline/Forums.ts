import type Uponline from '.';
import Base from '../Base';
import Util from '../Util';

export const List = [
    { module: 'Orientation/Regular News', name: '🟨 Welcome/Orientation', id: '2146' },
    { module: 'Orientation/Regular News', name: '🟦 Monday Posts', id: '2147' },
    { module: 'Orientation/Regular News', name: '🟩 Live Session Recordings', id: '2148' },
    { module: 'Orientation/Regular News', name: '🟥 Noticeboard', id: '2149' },
    { module: 'Orientation/Regular News', name: '🟪 Student Chitchat', id: '2150' },

    // { module: 'UX Principles I', name: 'Case study', id: '1479' },
    // { module: 'UX Principles I', name: 'UX Discussion Forum', id: '1504' },
    // { module: 'UX Principles I', name: 'DSD Noticeboard', id: '1674' },
    // { module: 'UX Principles I', name: 'Activities', id: '1695' },

    // { module: 'Development Principles I', name: 'Discussion forum', id: '1521' },
    // { module: 'Development Principles I', name: 'Activities', id: '1694' },

    // { module: 'Integrated Studio I', name: 'DSD Noticeboard', id: '1920' },
    // { module: 'Integrated Studio I', name: 'Discussion Forum', id: '1921' },
    // { module: 'Integrated Studio I', name: 'Activities', id: '1925' },
] as Forum[];

export interface Forum {
    /** The module this forum belongs to */
    module: string;
    /** The id of this forum */
    id: string;
    /** The name of this forum */
    name: string;
}

export interface PartialThread {
    /** The thread id */
    id: string;
    /** The title of the thread */
    title: string;
    /** The author of the thread */
    author: string;
    /** The approximate time the thread was updated */
    updatedAt: Date;
}

export default class Forums extends Base {
    public list: Forum[] = List;
    /** Uponline handler */
    public uponline: Uponline;

    public constructor(uponline: Uponline) {
        super(uponline.scraper);
        this.uponline = uponline;
    }

    /** Get the currently opened forum */
    public getOpenedForum(): string | undefined {
        const url = new URL(this.page.url());
        if (!url.toString().includes('/mod/forum/view.php')) return;
        return url.searchParams.get('id') || undefined;
    }

    /** Go to a forums page */
    public async goToForum(forum: Forum): Promise<void> {
        const url = `https://online.yoobee.ac.nz/mod/forum/view.php?id=${forum.id}`;
        this.log(`Navigating to forum ${forum.name}`);
        await this.page.goto(url).then(() => this.page.waitForTimeout(3000));
    }

    /** Produce a list of threads in a forum */
    public async listThreads(): Promise<PartialThread[]> {
        const currentId = this.getOpenedForum();
        if (!currentId) throw new Error('No forum is opened');

        const container = await this.page.$('.bux-forum-main');
        if (!container) return [];

        const rows = await container?.evaluate(n => Array.from(n.children).slice(1).map((c: any) => c.innerText));
        const urls = await container?.evaluate(n => Array.from(n.children).slice(1).map((c: any) => c.href));

        return (rows as any[])
            .map((r: string, i: number) => ({
                id: urls[i].split('discuss.php?d=')[1],
                title: r.split('\n')[0],
                author: r.split('\n')[1],
                updatedAt: Util.getTimeAgo(r.split('\n')[2]),
            }))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
}
