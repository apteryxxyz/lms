import 'dotenv/config';
process.env.MACLARY_ENV = process.env.NODE_ENV;
import { MaclaryClient, container } from 'maclary';
import { ActivityType, Partials } from 'discord.js';
import Loggr from 'cat-loggr/ts';
import GroupManager from '@groups/Manager';
import Scraper from './Scraper';

const client = new MaclaryClient({
    intents: ['Guilds', 'GuildMessages', 'MessageContent'],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Reaction],
    defaultPrefix: ';',
    developmentGuildId: '990277337352372254',
    developmentPrefix: 'd;',
    logger: new Loggr({ timestampFormat: 'YYYY/MM/DD HH:mm:ss' }).setGlobal(),
    presence: {
        activities: [
            {
                name: 'the LMS for updates',
                type: ActivityType.Watching,
            },
        ],
    },
});

container.client = client;
container.groups = new GroupManager();
container.scraper = new Scraper();

const token = process.env.DISCORD_TOKEN as string;
void container.client.login(token);
void container.scraper.setup();
void container.groups.initialise();

export default container;

declare module 'maclary' {
    export interface Container {
        scraper: Scraper;
        groups: GroupManager;
    }
}
