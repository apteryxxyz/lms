import { container, Event } from 'maclary';
import { Attachment, ButtonStyle, GuildTextBasedChannel } from 'discord.js';
import {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
} from '@discordjs/builders';
import { Events } from '../Scraper';
import type { Forum } from '@lib/scraper/uponline/Forums';
import type { Thread } from '@lib/scraper/uponline/Threads';
import Util from '@lib/scraper/Util';

const ChannelID = process.env.THREAD_ID as string;
const TrainerName = process.env.TRAINER_NAME as string;
const MentionID = process.env.MENTION_ID as string;

export default class ThreadCreate extends Event {
    public constructor() {
        super({
            name: Events.ThreadCreate,
            emitter: container.scraper as any,
            once: false,
        });
    }

    public override async handle(forum: Forum, thread: Thread): Promise<any> {
        const channel = await container.client.channels.fetch(ChannelID);
        const url = `https://uponline.education/mod/forum/discuss.php?d=${thread.id}`;
        const header = `Sent by ${thread.author} in ${forum.module}, ${forum.name}`;
        const content =
            thread.author === TrainerName ? `<@&${MentionID}>` : null;
        const files = thread.images.map(({ base64 }, i) => {
            const buff = Buffer.from(base64.split(',')[1], 'base64');
            return new Attachment(buff, `${i}.png`);
        });

        const embed = new EmbedBuilder()
            .setTitle(thread.title)
            .setDescription(`${header}\n\n${Util.cleanString(thread.content)}`)
            .setColor(0xea4f3d)
            .setTimestamp(thread.sentAt)
            .setImage(files.length === 1 ? 'attachment://0.png' : null);

        const goToThread = new ButtonBuilder()
            .setLabel('Go To Thread')
            .setURL(url)
            .setStyle(ButtonStyle.Link);

        const actionRow = new ActionRowBuilder().addComponents([goToThread]);

        const firstFiles = files.length === 1 ? files : [];
        return (channel as GuildTextBasedChannel)
            .send({
                embeds: [embed],
                content,
                files: firstFiles,
                components: [actionRow],
            } as any)
            .then((m) => (files.length > 1 ? m.reply({ files }) : null));
    }
}
