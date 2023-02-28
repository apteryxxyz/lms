import type { Browser, Page } from 'puppeteer';
import type { Client } from './Client';

export class Base {
    /** The client instance. */
    public readonly client: Client;

    public constructor(client: Client) {
        this.client = client;
    }

    /** Shortpage to the browser. */
    public get browser() {
        return this.client._browser as Browser;
    }

    /** Shorthand to the page. */
    public get page() {
        return this.client._page as Page;
    }

    public get logger() {
        return this.client._logger;
    }
}
