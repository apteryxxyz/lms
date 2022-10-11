import { Command, container } from 'maclary';

export default class Limit extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'limit',
            description: 'Change the limit of this group.',
            options: [
                {
                    type: Command.OptionType.Integer,
                    name: 'limit',
                    description: 'New limit to set',
                    required: true,
                    minValue: 1,
                    maxValue: 9,
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const groupList = container.groups.getGroups();
        const group = groupList.find(g => g.textId === interaction.channelId);
        if (!group) return void interaction.reply('This command must be run in a group.');

        const limit = interaction.options.getInteger('limit', true);
        void group.setMemberLimit(limit);
        return void interaction.reply('Successfully changed the member limit of the group.');
    }
}
