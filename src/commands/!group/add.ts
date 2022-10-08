import { Command, container } from 'maclary';

export default class Add extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'add',
            description: 'Manually add a user to this group.',
            options: [
                {
                    type: Command.OptionType.User,
                    name: 'user',
                    description: 'User to add to this group',
                    required: true,
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const groupList = container.groups.getGroups();
        const group = groupList.find(g => g.textId === interaction.channelId);
        if (!group) return void interaction.reply('This command must be run in a group.');

        const user = interaction.options.getUser('user', true);
        if (group.isManager(user.id) || group.isMember(user.id))
            return void interaction.reply('User is already a member of this group.');

        return group.addMember(user.id, interaction);
    }
}
