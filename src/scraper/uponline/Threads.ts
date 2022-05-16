import cheerio from 'cheerio';
import h2m from '@wakeful-cloud/html-translator';
import type Uponline from '.';
import Base from '../Base';
import type { PartialThread } from './Forums';
import Util from '../Util';

export interface Thread {
    /** The threads id */
    id: string;
    /** The title of the thread */
    title: string;
    /** The author of the thread */
    author: string;
    /** The threads content as markdown */
    content: string;
    /** The approximate time the thread was sent */
    sentAt: Date;
    /** An array of {@link Image}s the content of this thread included */
    images: Image[];
    /** An array of {@link Response}s to this thread */
    responses: Response[];
}

export interface Image {
    /** The images original src */
    src: string;
    /** Alt text for the image */
    alt: string;
    /** A base64 representation of the image */
    base64: string;
}

export interface Response {
    /** The title of the response */
    title: string;
    /** The author of the response */
    author: string;
    /** The responses content as markdown */
    content: string;
    /** The approximate time the response was sent */
    sentAt: Date;
    /** An array of {@link Response}s to this response */
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

    /** Reset this handler */
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

    /** Get all the responses to a thread */
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

    /** Resolve a single response and its own responses */
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
