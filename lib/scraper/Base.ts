import type { Browser, Page } from 'puppeteer';
import type Scraper from '.';

export default abstract class Base {
    public scraper: Scraper;

    public constructor(scraper: Scraper) {
        this.scraper = scraper;
    }

    /** Shorthand to the page */
    public get page(): Page {
        return this.scraper._page as Page;
    }

    /** Shortpage to the browser */
    public get browser(): Browser {
        return this.scraper._browser as Browser;
    }

    /** Log a message to the console with a timestamp */
    public log(message: string, method: 'info' | 'error' | 'warn' = 'info'): void {
        console[method](message);
    }

    /** Take a screenshot of the current page as a way to debug */
    public async debug(path = 'debug'): Promise<void> {
        path += '.png';
        await this.page?.screenshot({ path });
    }
}
