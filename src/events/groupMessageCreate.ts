import { container, Event } from 'maclary';
import { EmbedBuilder } from '@discordjs/builders';
import type { GuildTextBasedChannel } from 'discord.js';
import { Events } from '../Scraper';
import type { Group, Message } from '../scraper/uponline/Messages';
import Util from '../scraper/Util';

const ChannelID = process.env.MESSAGE_ID as string;
const TrainerName = process.env.TRAINER_NAME as string;
const MentionID = process.env.MENTION_ID as string;

export default class GroupMessage extends Event {
    public constructor() {
        super({
            name: Events.GroupMessageCreate,
            emitter: container.scraper as any,
            once: false,
        });
    }

    public override async handle(group: Group, message: Message): Promise<any> {
        const channel = await container.client.channels.fetch(ChannelID);
        const header = `Sent by ${message.author} in ${group.title}`;
        const content =
            message.author === TrainerName ? `<@&${MentionID}>` : null;

        const embed = new EmbedBuilder()
            .setDescription(header + '\n\n' + Util.cleanString(message.content))
            .setColor(0xea4f3d)
            .setTimestamp(message.sentAt);

        const payload = { embeds: [embed], content };
        return (channel as GuildTextBasedChannel).send(payload);
    }
}
