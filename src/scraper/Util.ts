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
    public static async loadCookies(page: Page): Promise<void> {
        const string = fs.readFileSync(CookieFile, 'utf8');
        const cookies = JSON.parse(string);
        await page.setCookie(...cookies);
        Base.prototype.log(`Loaded cookies from ${CookieFile}`);
    }

    /** Get all cookies from a page and save to a file */
    public static async saveCookies(page: Page): Promise<void> {
        const domains = [
            `https://${Uponline.Domain}`,
            `https://login.${Microsoft.Domain}`,
        ];
        const cookies = await page.cookies(...domains);
        fs.writeFileSync(CookieFile, JSON.stringify(cookies));
        Base.prototype.log(`Saved cookies to ${CookieFile}`);
    }

    /** Download an image from within a page */
    public static async downloadImage(
        page: Page,
        url: string,
    ): Promise<string> {
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
    public static getTimeAgo(when: string): Date {
        let now = new Date();

        const seconds = when.match(SecondsAgo);
        const minutes = when.match(MinutesAgo);
        const hours = when.match(HoursAgo);
        const days = when.match(DaysAgo);
        const months = when.match(MonthsAgo);

        if (seconds) now.setSeconds(now.getSeconds() - parseInt(seconds[1]));
        if (minutes) now.setMinutes(now.getMinutes() - parseInt(minutes[1]));
        if (hours) now.setHours(now.getHours() - parseInt(hours[1]));
        if (days) now.setDate(now.getDate() - parseInt(days[1]));
        if (months) now.setMonth(now.getMonth() - parseInt(months[1]));
        return now;
    }

    /** Clean a string */
    public static cleanString(str: string): string {
        str = str.replace(/\n+/g, '\n\n');
        str = str.replaceAll('\n**\n', '\n**');
        return str;
    }
}
