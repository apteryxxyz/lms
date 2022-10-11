import { Command, container } from 'maclary';

export default class Leave extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'transfer',
            description: 'Transfer ownership of this group to another member.',
            options: [
                {
                    type: Command.OptionType.User,
                    name: 'user',
                    description: 'User to give ownership to',
                    required: true,
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const groupList = container.groups.getGroups();
        const group = groupList.find(g => g.textId === interaction.channelId);
        if (!group) return void interaction.reply('This command must be run in a group.');

        if (!group.isManager(interaction.user.id)) {
            const manager = await group.getManager();
            return void interaction.reply(
                'Only the manager can transfer ownership of ' +
                    `the group, try asking ${manager.user.tag}`
            );
        }

        const user = interaction.options.getUser('user', true);
        if (!group.isMember(user.id))
            return void interaction.reply('User is not a member of this group.');

        return group.setManager(user.id, interaction);
    }
}
