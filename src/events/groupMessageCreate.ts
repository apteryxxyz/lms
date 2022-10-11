import { container, Event } from 'maclary';
import { EmbedBuilder } from '@discordjs/builders';
import type { GuildTextBasedChannel } from 'discord.js';
import { Events } from '../Scraper';
import type { Group, Message } from '@scraper/uponline/Messages';
import Util from '@scraper/Util';

const ChannelId = process.env.MESSAGES_CHANNEL_ID as string;
const MentionId = process.env.ROLE_MENTION_ID as string;
const MenitonRole = process.env.MENTION_MESSAGES === 'true';

export default class GroupMessage extends Event {
    public constructor() {
        super({
            name: Events.GroupMessageCreate,
            emitter: container.scraper as any,
            once: false,
        });
    }

    public override async handle(group: Group, message: Message): Promise<any> {
        const channel = await container.client.channels.fetch(ChannelId);
        const header = `Sent by ${message.author} in ${group.name}`;

        const embed = new EmbedBuilder()
            .setDescription(`${header}\n\n${Util.cleanString(message.content)}`)
            .setColor(0xea4f3d)
            .setTimestamp(message.sentAt);

        return (channel as GuildTextBasedChannel).send({
            content: MenitonRole ? `<@&${MentionId}>` : null,
            embeds: [embed],
        });
    }
}
