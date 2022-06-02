import Base from '../Base';
import type Scraper from '../Scraper';
import Util from '../Util';
import Messages from './Messages';
import Forums from './Forums';
import Threads from './Threads';
const Domain = 'uponline.education';

export default class Uponline extends Base {
    /** Uponline domain */
    public static Domain = Domain;
    /** Uponline domain */
    public Domain = Domain;
    /** Messages handler */
    public messages: Messages;
    /** Forums handler */
    public forums: Forums;
    /** Threads handler */
    public threads: Threads;
    /** Whether the scraper has logged into the LMS */
    public hasLoggedIn = false;
    /** Option to ignore handler resets */
    public ignoreReset = false;

    public constructor(scraper: Scraper) {
        super(scraper);
        this.messages = new Messages(this);
        this.forums = new Forums(this);
        this.threads = new Threads(this);
    }

    /** Reset all the handlers */
    public async reset(source?: Base): Promise<void> {
        if (!this.ignoreReset) {
            if (source !== this.messages) await this.messages.reset();
            if (source !== this.forums) await this.forums.reset();
            if (source !== this.threads) await this.threads.reset();
        }
    }

    /** Check if the current page is the LMS login page */
    public get isOnLoginPage(): boolean {
        return this.page.url().includes(`${Domain}/go`);
    }

    /** Check if the current page is the LMS course page */
    public get isOnCoursePage(): boolean {
        return (
            this.page.url().includes(`${Domain}/course`) ||
            this.page.url().includes(`${Domain}/mod`)
        );
    }

    /** Navigate to the LMS login page */
    public async goToLoginPage(): Promise<void> {
        this.log('Navigating to the LMS login page...');
        await this.page.goto(`https://${Domain}/go`);
        await this.page.waitForTimeout(3000);
    }

    public async goToHomePage(): Promise<void> {
        this.log('Navigating to the LMS home page...');
        await this.page.goto(`https://${Domain}/`);
        await this.page.waitForTimeout(3000);
        await this.reset(this);
    }

    /** Attempt to login to the LMS */
    public async login(): Promise<boolean> {
        if (this.hasLoggedIn) return true;
        if (!this.isOnLoginPage) await this.goToLoginPage();

        if (this.hasLoggedIn) return true;
        if (!this.isOnLoginPage) await this.goToLoginPage();

        this.log('Attempting to login to LMS...');
        await this.page.click('[id=button1]');
        await this.page.waitForTimeout(5000);

        if (!this.isOnCoursePage) {
            // If directed to Microsoft's login page, try to login
            this.log('LMS login requires login to Microsoft');
            await this.scraper.microsoft?.login();
        } else if (this.scraper.microsoft) {
            this.scraper.microsoft.hasLoggedIn = true;
        }

        if (!this.isOnCoursePage) return false;
        this.hasLoggedIn = true;
        this.log('Logged into the LMS');

        // Save cookies
        await Util.saveCookies(this.page);

        return true;
    }
}
