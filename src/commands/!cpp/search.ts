import { Command } from 'maclary';
import { EmbedBuilder } from '@discordjs/builders';
import fs from 'fs';

const Language = fs.readFileSync('assets/cpplang.txt', 'utf8').split(/\r?\n/);
const Library = fs.readFileSync('assets/cpplibs.txt', 'utf-8').split(/\r?\n/);

export default class Search extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'search',
            description: 'Search for a C++ item on cppreference.',
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
        const query = interaction.options
            .getString('query', true)
            .toLowerCase()
            .replace(/std/g, '')
            .replace(/::/g, ' ')
            .replace(/\//g, ' ');

        const rawLang = Language.map(l => (l.includes(query) ? l.split(' ') : null))
            .filter(l => l !== null)
            .slice(0, 10) as string[][];
        const rawLib = Library.map(l => (l.includes(query) ? l.split(' ') : null))
            .filter(l => l !== null)
            .slice(0, 10) as string[][];

        const makeUrl = (item: string[]) => `https://en.cppreference.com/w/cpp/${item.join('/')}`;
        const language = rawLang.map(l => `[\`(${l[0]}) ${l.slice(1).join('/')}\`](${makeUrl(l)})`);
        const library = rawLib.map(
            l => `[\`(${l[0]}) std::${l.slice(1).join('::')}\`](${makeUrl(l)})`
        );

        const searchUrl =
            'https://en.cppreference.com/mwiki/index.php?title=Special%3ASearch' +
            `&search=${encodeURI(query)}`;

        const embed = new EmbedBuilder()
            .setTitle(`C++ Search Results for **\`${query}\`**`)
            .setColor(0x044f88)
            .setTimestamp()
            .setDescription(
                (language.length ? '**Language Results**\n' + language.join('\n') : '') +
                    (library.length ? '\n\n**Library Results**\n' + library.join('\n') : '') || null
            )
            .addFields([
                {
                    name: "Didn't find what you were looking for?",
                    value: `See more [\`${query}\` results](${searchUrl}).`,
                },
            ]);

        interaction.reply({ embeds: [embed] });
    }
}
