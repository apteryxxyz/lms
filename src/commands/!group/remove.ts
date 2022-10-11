import { Command, container } from 'maclary';

export default class Remove extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'remove',
            description: 'Manually remove a user from this group.',
            options: [
                {
                    type: Command.OptionType.User,
                    name: 'user',
                    description: 'User to remove from this group.',
                    required: true,
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

        const user = interaction.options.getUser('user', true);
        if (group.isManager(user.id))
            return void interaction.reply({
                ephemeral: true,
                content: 'Cannot remove the manager of this group.',
            });
        if (!group.isMember(user.id))
            return void interaction.reply({
                ephemeral: true,
                content: 'User is not a member of this group.',
            });

        return group.removeMember(user.id, interaction);
    }
}
