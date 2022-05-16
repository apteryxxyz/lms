import cheerio from 'cheerio';
import h2m from '@wakeful-cloud/html-translator';
import type Uponline from '.';
import Base from '../Base';
import type { PartialThread } from './Forums';
import Util from '../Util';

export interface Image {
    src: string;
    alt: string;
    base64: string;
}

export interface Thread {
    id: string;
    title: string;
    author: string;
    content: string;
    sentAt: Date;
    images: Image[];
    responses: Response[];
}

export interface Response {
    title: string;
    author: string;
    content: string;
    sentAt: Date;
    responses: Response[];
}

export default class Threads extends Base {
    /** Uponline handler */
    public uponline: Uponline;
    /** Currently opened thread */
    public openedThread?: PartialThread['id'];

    public constructor(uponline: Uponline) {
        super(uponline.client);
        this.uponline = uponline;
    }

    public async reset(): Promise<void> {
        this.openedThread = undefined;
    }

    /** Go to a forum thread */
    public async goToThread(thread: PartialThread): Promise<void> {
        this.log(`Opening thread '${thread.title}'...`);
        const url = `https://uponline.education/mod/forum/discuss.php?d=${thread.id}`;
        await this.page.goto(url);

        // When navigating to a new page, the message panel hides, reopen it
        await this.uponline.reset(this);
        this.openedThread = thread.id;
        await this.page.waitForTimeout(3000);
    }

    /** Get the post content of the current thread */
    public async getThreadContent(): Promise<Thread> {
        const core = await this.page.$('[data-region-content*="-post-core"]');
        if (!core) throw new Error('Could not find thread content');
        const html = await core.evaluate((n) => n.innerHTML);
        const $ = cheerio.load(html);

        const id = this.page.url().match(/discuss.php\?d=(\d+)/)?.[1] as string;
        const title = $('h1').first().text();
        const author = $('address').first().text().trim();
        const when = $('.forum-ago').first().text().trim();
        const body = $('.post-content-container').first().html();
        const sentAt = Util.getTimeAgo(when);

        let { markdown, images } = h2m(body);
        for (let i = 0; i < images.length; i++)
            (images[i] as Image).base64 = await Util.downloadImage(
                this.page,
                images[i].src,
            );
        const responses = await this.getThreadResponses();

        return {
            id,
            title,
            author,
            sentAt,
            content: markdown,
            images: images as Image[],
            responses,
        };
    }

    private async getThreadResponses(): Promise<Response[]> {
        const core = await this.page.content();
        if (!core) throw new Error('Could not find thread responses');
        const $ = cheerio.load(core);

        const container = $('[data-region="replies-container"] > div');
        const replies = Array.from(container.first().children('article'));
        const responses = replies.map((r: any) =>
            this.resolveResponse($.html(r.children)),
        );

        return responses;
    }

    private resolveResponse(html: string): Response {
        const $ = cheerio.load(html);

        const header = $('header').first().text().split('\n');
        const items = header.map((t) => t.trim()).filter(Boolean);
        const [title, when, author] = items;
        const sentAt = Util.getTimeAgo(when);
        const content = $('div.text_to_html').first().text();

        const container = $('[data-region="replies-container"] > div');
        const replies = Array.from(container.first().children('article'));
        const responses = replies.map((r: any) =>
            this.resolveResponse($.html(r.children)),
        );

        return { title, sentAt, author, content, responses };
    }
}

// data-region="replies-container" > div
// . > data-region="post"
