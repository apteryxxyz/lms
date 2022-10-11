import { container, Event } from 'maclary';
import { AttachmentBuilder, ButtonStyle, GuildTextBasedChannel } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders';
import { Events } from '../Scraper';
import type { Forum } from '@scraper/uponline/Forums';
import type { Thread } from '@scraper/uponline/Threads';
import Util from '@scraper/Util';

const ChannelId = process.env.THREADS_CHANNEL_ID as string;
const MentionId = process.env.ROLE_MENTION_ID as string;
const MentionRole = process.env.MENTION_THREADS === 'true';

export default class ThreadCreate extends Event {
    public constructor() {
        super({
            name: Events.ThreadCreate,
            emitter: container.scraper as any,
            once: false,
        });
    }

    public override async handle(forum: Forum, thread: Thread): Promise<any> {
        const channel = (await container.client.channels.fetch(ChannelId)) as GuildTextBasedChannel;
        const url = `https://online.yoobee.ac.nz/mod/forum/discuss.php?d=${thread.id}`;
        const header = `Sent by ${thread.author} in ${forum.module}, ${forum.name}`;
        const files = thread.images.map(({ base64 }, i) => {
            const buff = Buffer.from(base64.split(',')[1], 'base64');
            const ext = base64.substring('data:image/'.length, base64.indexOf(';base64'));
            return new AttachmentBuilder(buff).setName(`${i}.${ext}`);
        });

        let description = thread.content;
        if (description.length > 3000) description = `${description.slice(0, 3000)}...`;

        const embed = new EmbedBuilder()
            .setTitle(thread.title)
            .setDescription(`${header}\n\n${Util.cleanString(description)}`)
            .setColor(0xea4f3d)
            .setTimestamp(thread.sentAt)
            .setImage(files.length === 1 ? 'attachment://0.png' : null);

        const goToThread = new ButtonBuilder()
            .setLabel('Go To Thread')
            .setURL(url)
            .setStyle(ButtonStyle.Link);

        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents([goToThread]);

        const firstFiles = files.length === 1 ? files : [];
        return channel
            .send({
                embeds: [embed],
                content: MentionRole ? `<@&${MentionId}>` : undefined,
                files: firstFiles,
                components: [actionRow],
            })
            .then(m => (files.length > 1 ? m.reply({ files }) : null));
    }
}
