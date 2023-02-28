import 'dotenv/config';
import * as process from 'node:process';
import { Scraper } from '@yoobee/scraper';
import CatLoggr from 'cat-loggr/ts';
import { Client as Discord, GatewayIntentBits, Partials } from 'discord.js';
import type { ConsoleLike } from 'maclary';
import { Maclary, container } from 'maclary';

const logger = new CatLoggr();
container.logger = logger as unknown as ConsoleLike;

const discord = new Discord({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});
const maclary = new Maclary({
    defaultPrefix: '!',
    guildId: '990277337352372254',
});
Maclary.init(maclary, discord);

const scraper = new Scraper({
    microsoftUsername: process.env['MICROSOFT_USERNAME']!,
    microsoftPassword: process.env['MICROSOFT_PASSWORD']!,
    categoryName: 'Group Messages',
    conversationId: process.env['CONVERSATION_ID']!,
    logger: container.logger,
});
container.scraper = scraper;

void discord.login(process.env['DISCORD_TOKEN']!);
scraper.start('0,20,40 8-22 * * 1-6');

declare module 'maclary' {
    interface Container {
        scraper: Scraper;
    }
}
