import process from 'node:process';
import { EmbedBuilder, bold } from '@discordjs/builders';
import type { Conversation, Message } from '@yoobee/scraper';
import { Events, Utilities } from '@yoobee/scraper';
import { Listener, container } from 'maclary';

const ChannelId = process.env['CONVERSATION_CHANNEL_ID'] as string;

export class OnConversationMessageCreate extends Listener<any> {
    public constructor() {
        super({
            event: Events.ConversationMessageCreate,
            emitter: container.scraper,
            once: false,
        });
    }

    public override async run(conversation: Conversation, message: Message) {
        const channel = await container.client.channels.fetch(ChannelId);
        if (!channel || !('send' in channel)) return;

        let content = Utilities.cleanString(message.content);
        if (content.length > 2_048) content = content.slice(0, 2_045) + '...';

        const embed = new EmbedBuilder()
            .setTitle(message.author)
            .setDescription(content)
            .setColor(0xbd89ff)
            .setTimestamp(message.sentAt);

        return channel.send({
            content: bold(conversation.name),
            embeds: [embed],
        });
    }
}
