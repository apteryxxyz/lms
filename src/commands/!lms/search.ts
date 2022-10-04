import { Command } from 'maclary';
import Database from '@src/Database';
import { Context } from '@maclary/context';
import Fuse from 'fuse.js';
import { EmbedBuilder } from '@discordjs/builders';

export default class Search extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Prefix, Command.Kind.Slash],
            name: 'search',
            description: 'Search the LMS for a query.',
            options: [
                {
                    type: Command.OptionType.String,
                    name: 'query',
                    description: 'The query to search for',
                    required: true,
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const query = interaction.options.getString('query', true);
        return this.sharedRun(new Context(interaction), query);
    }

    public override async onMessage(
        message: Command.Message,
        args: Command.Arguments
    ): Promise<void> {
        const query = args.rest();
        return this.sharedRun(new Context(message), query);
    }

    public async sharedRun(context: Context, query: string): Promise<void> {
        const topics = await Database.getAllModuleTopics();
        const subtopics = topics.map(t => t.subtopics).flat();
        const fuse = new Fuse(subtopics, {
            includeMatches: true,
            includeScore: true,
            keys: ['index', 'title', 'content'],
        });

        const results = fuse.search(query);
        const result = results[0];

        if (result) {
            const content =
                result.item.content.length > 4000
                    ? `${result.item.content.substring(0, 4000)}...`
                    : result.item.content;

            const embed = new EmbedBuilder()
                .setTitle(`${result.item.index} ${result.item.title}`)
                .setDescription(content)
                .setColor(0xea4f3d)
                .setTimestamp();

            await context.reply({ embeds: [embed] });
        } else {
            await context.reply('No results were found for inputted query.');
        }
    }
}
