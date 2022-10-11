import { Command, container } from 'maclary';

export default class Description extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'description',
            description: 'Change the description of this group.',
            options: [
                {
                    type: Command.OptionType.String,
                    name: 'description',
                    description: 'New description to set',
                    required: true,
                    maxLength: 500,
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const groupList = container.groups.getGroups();
        const group = groupList.find(g => g.textId === interaction.channelId);
        if (!group)
            return void interaction.reply({
                ephemeral: true,
                content: 'This command must be run in a group.',
            });

        const description = interaction.options.getString('description', true);
        void group.setDescription(description);
        return void interaction.reply('Successfully changed the groups description.');
    }
}
