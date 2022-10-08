import { Command, container } from 'maclary';

export default class Name extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'name',
            description: 'Change the name of this group.',
            options: [
                {
                    type: Command.OptionType.String,
                    name: 'name',
                    description: 'New name to set',
                    required: true,
                    maxLength: 100,
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const groupList = container.groups.getGroups();
        const group = groupList.find(g => g.textId === interaction.channelId);
        if (!group) return void interaction.reply('This command must be run in a group.');

        const name = interaction.options.getString('name', true);
        void group.setName(name);
        return void interaction.reply('Successfully renamed the group.');
    }
}
