import type { Browser, Page } from 'puppeteer';
import { container } from 'maclary';
import type Client from './Client';

export default abstract class Base {
    public client: Client;

    public constructor(client: Client) {
        this.client = client;
    }

    /** Shorthand to the page */
    public get page(): Page {
        return this.client._page as Page;
    }

    /** Shorthand to the browser */
    public get browser(): Browser {
        return this.client._browser as Browser;
    }

    /** Force the client to wait a number of milliseconds */
    public wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /** Log a message to the console, with a timestamp */
    public log(message: string) {
        // console.log(`[${new Date().toISOString()}] ${message}`);
        container.logger.info(message);
    }

    /** Take of a screenshot of the current page as a way to debug */
    public async debug(path: string = 'debug') {
        path += '.png';
        await this.page?.screenshot({ path });
        // this.log(`Screenshot saved to '${path}'`);
    }
}
