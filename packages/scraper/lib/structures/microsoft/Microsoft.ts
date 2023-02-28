import { Base } from '../Base';
import type { Client } from '../Client';
import * as Utilities from '~/Utilities';

let username: string;
let password: string;

export class Microsoft extends Base {
    public constructor(client: Client, options: Microsoft.Options) {
        super(client);

        username = options.username;
        password = options.password;
    }

    public async isOnLoginPage() {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');

        const documentTitle = await this.page.title();
        return documentTitle === 'Sign in to your account';
    }

    public async login() {
        if (!this.client.isReady())
            throw new Error('Browser or page not ready');
        if (!(await this.isOnLoginPage()))
            throw new Error('Not on Microsoft login page');

        this.logger.info('Attempting to login to Microsoft...');

        // Enter the username and click the next button
        await this.page.type('#i0116', username);
        await this.page.click('#idSIButton9');
        await this.page.waitForNetworkIdle();

        // Enter the password and click the sign in button
        await this.page.type('#i0118', password);
        await this.page.click('#idSIButton9');
        await this.page.waitForNetworkIdle();

        // Confirm "Stay signed in"
        await Utilities.sleepSeconds(2);
        await this.page.click('#KmsiCheckboxField');

        // Press the sign in button
        await this.page.click('#idSIButton9');
        await this.page.waitForNetworkIdle();

        this.logger.info('Logged into Microsoft');
    }
}

export namespace Microsoft {
    export interface Options {
        /** The username to use when logging in. */
        username: string;
        /** The password to use when logging in. */
        password: string;
    }
}
