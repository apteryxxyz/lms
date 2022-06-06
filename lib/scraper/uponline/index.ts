import Base from '../Base';
import type Scraper from '..';
import Util from '../Util';
import Forums from './Forums';
import Messages from './Messages';
import Modules from './Modules';
import Navigation from './Navigation';
import Threads from './Threads';
import Topics from './Topics';
const Domain = 'uponline.education';

export default class Uponline extends Base {
    /** Uponline domain */
    public Domain = Domain;
    /** Forums handler */
    public forums: Forums;
    /** Messages handler */
    public messages: Messages;
    /** Modules handler */
    public modules: Modules;
    /** Navigation handler */
    public navigation: Navigation;
    /** Threads handler */
    public threads: Threads;
    /** Topics handler */
    public topics: Topics;

    public constructor(scraper: Scraper) {
        super(scraper);
        this.forums = new Forums(this);
        this.messages = new Messages(this);
        this.modules = new Modules(this);
        this.navigation = new Navigation(this);
        this.threads = new Threads(this);
        this.topics = new Topics(this);
    }

    /** Check whether the client is on the Uponline login page */
    public isOnLoginPage(): Promise<boolean> {
        return Promise.resolve(this.page.url().includes(`${Domain}/go`));
    }

    /** Check whether the client is on the Uponline home page */
    public isOnCoursePage(): Promise<boolean> {
        return Promise.resolve(
            this.page.url().includes(`${Domain}/course`) ||
                this.page.url().includes(`${Domain}/mod`),
        );
    }

    /** Navigate to the LMS login page */
    public async goToLoginPage(): Promise<void> {
        if (await this.isOnLoginPage()) return;
        this.log('Navigating to the LMS login page...');
        await this.page.goto(`https://${Domain}/go`);
        await this.page.waitForTimeout(3000);
    }

    /** Navigate to the LMS home page */
    public async goToHomePage(): Promise<void> {
        this.log('Navigating to the LMS home page...');
        await this.page.goto(`https://${Domain}/`);
        await this.page.waitForTimeout(3000);
    }

    /** Attempt to login to the LMS */
    public async login(): Promise<boolean> {
        if (await this.isOnCoursePage()) return true;
        await this.goToLoginPage();
        if (await this.isOnCoursePage()) return true;

        this.log('Attempting to login to LMS...');
        await this.page.click('[id=button1]');
        await this.page.waitForTimeout(5000);

        if (!this.isOnCoursePage) {
            // If directed to Microsoft's login page, try to login
            this.log('LMS login requires login to Microsoft');
            await this.scraper.microsoft?.login();
        }

        if (!(await this.isOnCoursePage())) return false;
        this.log('Logged into the LMS');

        // Save cookies to file
        await Util.saveCookies(this.page);
        return true;
    }

    /** Uponline domain */
    public static Domain = Domain;
}
