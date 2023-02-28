import { URL } from 'node:url';
import { Base } from '../Base';
import type { Client } from '../Client';
import { Messages } from './Messages';
import * as Constants from '~/Constants';
import * as Utilities from '~/Utilities';

export class Uponline extends Base {
    public messages: Messages;

    public constructor(client: Client) {
        super(client);

        this.messages = new Messages(this);
    }

    /** Check whether the client is on the Uponline login page. */
    public async isOnLoginPage() {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');

        const documentTitle = await this.page.title();
        return documentTitle.startsWith('Sign in |');
    }

    /** Check whether the client is logged in to the Uponline course. */
    public async isOnCoursePage() {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');

        const pageUrl = this.page.url();
        return /\/(mod|course)\//.test(pageUrl);
    }

    /** Navigate to the LMS login page. */
    public async goToLoginPage() {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');
        if (await this.isOnLoginPage()) return;

        this.logger.info('Navigating to Uponline login page...');
        const pageUrl = new URL('go', Constants.UponlineURL);
        await this.page.goto(pageUrl.toString());
        await this.page.waitForNetworkIdle();
        await Utilities.sleepSeconds(2);
    }

    /** Navigate to the LMS home page. */
    public async goToHomePage(): Promise<void> {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');

        this.logger.info('Navigating to Uponline home page...');
        await this.page.goto(Constants.UponlineURL.toString());
        await this.page.waitForNetworkIdle();
    }

    /** Attempt to login to the Uponline LMS. */
    public async login() {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');

        await this.goToLoginPage();
        if (await this.isOnCoursePage()) return;

        this.logger.info('Attempting to login to Uponline...');

        await this.page.waitForSelector('#button1');
        await this.page.click('#button1');
        await this.page.waitForNetworkIdle();

        if (await this.isOnCoursePage()) return;

        await this.client.microsoft.login();
        await Utilities.saveCookiesFromPage(this.page);
    }
}
