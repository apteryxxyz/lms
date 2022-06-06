import type Uponline from '.';
import Base from '../Base';
import Util from '../Util';

export const List = [
    // { module: 'UX Principles I', name: 'Case study', id: '1479' },
    // { module: 'UX Principles I', name: 'UX Discussion Forum', id: '1504' },
    // { module: 'UX Principles I', name: 'DSD Noticeboard', id: '1674' },
    // { module: 'UX Principles I', name: 'Activities', id: '1695' },

    // { module: 'Development Principles I', name: 'Discussion forum', id: '1521' },
    // { module: 'Development Principles I', name: 'Activities', id: '1694' },

    { module: 'Integrated Studio I', name: 'DSD Noticeboard', id: '1920' },
    { module: 'Integrated Studio I', name: 'Discussion Forum', id: '1921' },
    { module: 'Integrated Studio I', name: 'Activities', id: '1925' },
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
        const url = `https://uponline.education/mod/forum/view.php?id=${forum.id}`;
        this.log(`Navigating to forum ${forum.name}`);
        await this.page.goto(url).then(() => this.page.waitForTimeout(3000));
    }

    /** Produce a list of threads in a forum */
    public async listThreads(): Promise<PartialThread[]> {
        const currentId = this.getOpenedForum();
        if (!currentId) throw new Error('No forum is opened');
        const { page } = this;

        async function getInfos(): Promise<string[]> {
            const e = await page.$$('#first-post-author-image');
            const t = await Promise.all(e.map((e: any) => e.evaluate((n: any) => n.innerText)));
            return t.map((y) =>
                y
                    .split('\n')
                    .map((s: any) => s.trim())
                    .filter(Boolean),
            );
        }

        async function getIds(): Promise<string[]> {
            const e = await page.$$('[id="first-post-author-image"]');
            const t = await Promise.all(e.map((e: any) => e.evaluate((n: any) => n.innerHTML)));
            return t.map((y) => y.match(/discuss.php\?d=(\d+)/)[1]);
        }

        async function getDates(): Promise<string[]> {
            const e = await page.$$('[id="last-post-ago"]');
            return Promise.all(e.map((e: any) => e.evaluate((n: any) => n.innerText)));
        }

        const infos = await getInfos();
        const ids = await getIds();
        const dates = (await getDates()).map((d) => Util.getTimeAgo(d));

        return infos
            .map((info, i) => ({
                id: ids[i],
                title: info[1],
                author: info[0],
                updatedAt: dates[i],
            }))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
}
