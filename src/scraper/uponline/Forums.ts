import type Uponline from '.';
import Base from '../Base';
import Util from '../Util';

const ForumsList = [
    // { module: 'UX Principles I', name: 'Case study', id: '1479' },
    // { module: 'UX Principles I', name: 'UX Discussion Forum', id: '1504' },
    // { module: 'UX Principles I', name: 'DSD Noticeboard', id: '1674' },
    // { module: 'UX Principles I', name: 'Activities', id: '1695' },

    // {
    //     module: 'Development Principles I',
    //     name: 'Discussion forum',
    //     id: '1521',
    // },
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
    /** List of forums */
    static List = ForumsList;
    /** List of forums */
    public List = ForumsList;
    /** Uponline handler */
    public uponline: Uponline;
    /** Currently opened forum */
    public openedForum?: Forum['id'];
    /** List of threads in the current forum */
    public visibleThreads?: PartialThread[];

    public constructor(uponline: Uponline) {
        super(uponline.client);
        this.uponline = uponline;
    }

    /** Reset this handler */
    public async reset(): Promise<void> {
        this.openedForum = undefined;
        this.visibleThreads = undefined;
    }

    /** Go to a forums page */
    public async goToForum(forum: Forum): Promise<void> {
        this.log(`Opening forum '${forum.module} ${forum.name}'...`);
        const url = `https://uponline.education/mod/forum/view.php?id=${forum.id}`;
        await this.page.goto(url);
        await this.page.waitForTimeout(3000);
        
        this.openedForum = forum.id;
        // When navigating to a new page, the message panel hides, reopen it
        await this.uponline.reset(this);
    }

    /** Produce a list of threads in a forum */
    public async listThreads(): Promise<PartialThread[]> {
        if (!this.openedForum) throw new Error('Forum not opened');
        const page = this.client.page;

        async function getInfos() {
            let elements = await page.$$('[id="first-post-author-image"]');
            let promises = elements.map((e) => e.evaluate((n) => n.innerText));
            let texts = await Promise.all(promises);
            return texts.map((t) =>
                t
                    .split('\n')
                    .map((s: any) => s.trim())
                    .filter(Boolean),
            );
        }

        async function getIds() {
            let elements = await page.$$('[id="first-post-author-image"]');
            let promises = elements.map((e) => e.evaluate((n) => n.innerHTML));
            let texts = await Promise.all(promises);
            return texts.map((t) => t.match(/discuss.php\?d=(\d+)/)[1]);
        }

        async function getDates() {
            let elements = await page.$$('[id="last-post-ago"]');
            let promises = elements.map((e) => e.evaluate((n) => n.innerText));
            return Promise.all(promises);
        }

        const infos = await getInfos();
        const ids = await getIds();
        const dates = (await getDates()).map(Util.getTimeAgo);

        return (this.visibleThreads = infos
            .map((info, i) => ({
                id: ids[i],
                title: info[1],
                author: info[0],
                updatedAt: dates[i],
            }))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));
    }
}
