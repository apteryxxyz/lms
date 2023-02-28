import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout } from 'node:timers';
import type { Page } from 'puppeteer';
import { MicrosoftLoginURL, UponlineURL } from './Constants';

const CookieFile = 'cookies.json';
const SecondsAgo = /(\d+) seconds? ago/;
const MinutesAgo = /(\d+) minutes? ago/;
const HoursAgo = /(\d+) hours? ago/;
const DaysAgo = /(\d+) days? ago/;
const MonthsAgo = /(\d+) months? ago/;

export type ConsoleLike = Pick<Console, 'info' | 'warn' | 'error'>;

/** Load the locally saved cookies into a page. */
export async function loadCookiesIntoPage(page: Page, cookieFile = CookieFile) {
    const rawCookies = readFileSync(cookieFile, 'utf8');
    const parsedCookies = JSON.parse(rawCookies);
    await page.setCookie(...parsedCookies);
}

/** Save the cookies from a page to a local file. */
export async function saveCookiesFromPage(page: Page, cookieFile = CookieFile) {
    const domains = [UponlineURL.toString(), MicrosoftLoginURL.toString()];
    const cookies = await page.cookies(...domains);
    writeFileSync(cookieFile, JSON.stringify(cookies, null, 4));
}

/** Wait for a number of seconds. */
export function sleepSeconds(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1_000));
}

/** Download an image from within the context of the browser. */
export async function downloadImage(page: Page, url: string) {
    const imageBase64 = await page.evaluate(async url => {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }, url);

    return typeof imageBase64 === 'string' ? imageBase64 : null;
}

/** Convert a sort of "Created at" string into a date. */
export async function getTimeAgo(when: string) {
    const now = new Date();

    const seconds = SecondsAgo.exec(when);
    if (seconds) now.setSeconds(now.getSeconds() - Number(seconds[1]));

    const minutes = MinutesAgo.exec(when);
    if (minutes) now.setMinutes(now.getMinutes() - Number(minutes[1]));

    const hours = HoursAgo.exec(when);
    if (hours) now.setHours(now.getHours() - Number(hours[1]));

    const days = DaysAgo.exec(when);
    if (days) now.setDate(now.getDate() - Number(days[1]));

    const months = MonthsAgo.exec(when);
    if (months) now.setMonth(now.getMonth() - Number(months[1]));

    return now;
}

/** Clean up a string. */
export function cleanString(str: string): string {
    return str.replaceAll(/[\n\r]+/g, '\n\n').replaceAll('\n**\n', '\n**');
}
