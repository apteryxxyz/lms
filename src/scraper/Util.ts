import type { Page } from 'puppeteer';
import fs from 'fs';
import Uponline from './uponline';
import Microsoft from './microsoft';
import Base from './Base';

const CookieFile = 'cookies.json';
const SecondsAgo = /(\d+) seconds? ago/;
const MinutesAgo = /(\d+) minutes? ago/;
const HoursAgo = /(\d+) hours? ago/;
const DaysAgo = /(\d+) days? ago/;
const MonthsAgo = /(\d+) months? ago/;

export default class Util extends null {
    /** Load cookies from a file and save to page */
    static async loadCookies(page: Page) {
        const string = fs.readFileSync(CookieFile, 'utf8');
        const cookies = JSON.parse(string);
        await page.setCookie(...cookies);
        Base.prototype.log(`Loaded cookies from ${CookieFile}`);
    }

    /** Get all cookies from a page and save to a file */
    static async saveCookies(page: Page) {
        const domains = [
            'https://' + Uponline.Domain,
            'https://login.' + Microsoft.Domain,
        ];
        const cookies = await page.cookies(...domains);
        fs.writeFileSync(CookieFile, JSON.stringify(cookies));
        Base.prototype.log(`Saved cookies to ${CookieFile}`);
    }

    /** Download an image from within a page */
    static async downloadImage(page: Page, url: string): Promise<string> {
        const base64 = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }, url);
        return base64 as string;
    }

    /** Get the date for a when string */
    static getTimeAgo(when: string): Date {
        let now = new Date();
        now = new Date(
            `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
        );
        const [seconds, minutes, hours, days, months] = [
            SecondsAgo,
            MinutesAgo,
            HoursAgo,
            DaysAgo,
            MonthsAgo,
        ].map((r) => when.match(r));

        if (seconds) now.setSeconds(now.getSeconds() - parseInt(seconds[1]));
        else if (minutes) now.setMinutes(now.getMinutes() - parseInt(minutes[1]));
        else if (hours) now.setHours(now.getHours() - parseInt(hours[1]));
        else if (days) now.setDate(now.getDate() - parseInt(days[1]));
        else if (months) now.setMonth(now.getMonth() - parseInt(months[1]));
        return now;
    }

    static cleanString(str: string): string {
        str = str.replace(/\n+/g, '\n\n');
        str = str.replaceAll('\n**\n', '\n**');
        return str;
    }
}
