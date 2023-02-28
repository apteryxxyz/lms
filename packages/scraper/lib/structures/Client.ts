import process from 'node:process';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import { Base } from './Base';
import { Microsoft } from './microsoft/Microsoft';
import { Uponline } from './uponline/Uponline';
import * as Utilities from '~/Utilities';

export class Client<R extends boolean = boolean> extends Base {
    /** @internal */ public _logger: Utilities.ConsoleLike;
    /** @internal */ public _browser: R extends true ? Browser : null =
        null as any;
    /** @internal */ public _page: R extends true ? Page : null = null as any;

    public readonly microsoft: Microsoft;
    public readonly uponline: Uponline;

    public constructor(options: Client.Options) {
        super({} as Client);

        this._logger = options.logger ?? console;

        Reflect.set(this, 'client', this);
        this.microsoft = new Microsoft(this, {
            username: options.microsoftUsername,
            password: options.microsoftPassword,
        });
        this.uponline = new Uponline(this);
    }

    /** Check if the browser and page are both ready. */
    public isReady(): this is Client<true> {
        return Boolean(this._browser && this._page);
    }

    /** Launch the Puppeteer browser. */
    public async launchBrowser() {
        if (this._browser) await this.closeBrowser();

        const isProduction = process.env['NODE_ENV'] === 'production';
        const devOptions = { headless: false };
        const prodOptions = {
            pipe: true,
            args: ['--disable-gpu', '--no-sandbox', '--disable-extensions'],
        };

        this.logger.info('Launching browser...');
        const browser = await puppeteer.launch(
            isProduction ? prodOptions : devOptions
        );
        Reflect.set(this, '_browser', browser);

        return this._browser;
    }

    /** Launch the Puppeteer page. */
    public async launchPage() {
        if (!this._browser) await this.launchBrowser();
        if (this._page) await this.closePage();

        this.logger.info('Launching page...');
        const page = await this._browser!.newPage();
        // await page.setViewport({ width: 1_920, height: 1_080 });
        await Utilities.loadCookiesIntoPage(page);

        Reflect.set(this, '_page', page);
        return this._page;
    }

    /** Close the Puppeteer browser. */
    public async closeBrowser() {
        if (!this._browser) return;

        this.logger.info('Closing browser...');
        await this._browser.close();
        Reflect.set(this, '_browser', null);
    }

    /** Close the Puppeteer page. */
    public async closePage() {
        if (!this._page) return;

        this.logger.info('Closing page...');
        await this._page.close();
        Reflect.set(this, '_page', null);
    }
}

export namespace Client {
    export interface Options {
        /** The username to use when logging in. */
        microsoftUsername: string;
        /** The password to use when logging in. */
        microsoftPassword: string;

        logger: Utilities.ConsoleLike;
    }
}
