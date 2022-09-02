import puppeteer, { Browser, Page } from 'puppeteer';
import Base from './Base';
import Uponline from './uponline';
import Microsoft from './microsoft';
import Util from './Util';

export default class Scraper extends Base {
    /** The puppeteer browser */
    public _browser?: Browser;
    /** The puppeteer page */
    public _page?: Page;
    /** Uponline handler */
    public uponline?: Uponline;
    /** Microsoft handler */
    public microsoft?: Microsoft;
    /** Whether the client has initialised */
    public hasInitialised = false;

    public constructor() {
        super({} as Scraper);
        this.scraper = this;
    }

    public async initialise(): Promise<void> {
        if (!this._browser) {
            // Launch the browser if it isn't already running
            this.log('Launching browser...');

            const devOptions = { headless: false };
            const prodOptions = { pipe: true, args: ['--disable-gpu', '--no-sandbox', '--disable-extensions'] };
            const options = Util.isDocker() || process.env.NODE_ENV === 'production' ? prodOptions : devOptions;
            this._browser = await puppeteer.launch(options);
        }

        this.log('Creating page...');
        this._page = await this._browser.newPage();

        // Load cookies from the 'cookies.json' and set them on the page
        await Util.loadCookies(this._page);

        this.uponline = new Uponline(this);
        this.microsoft = new Microsoft(this);

        this.hasInitialised = true;
    }
}

declare module 'puppeteer' {
    export interface Element {
        [key: string]: any;
    }
}
