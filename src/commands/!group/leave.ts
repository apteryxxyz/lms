import { Command, container } from 'maclary';

export default class Leave extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'leave',
            description: 'Leave this group.',
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

        const commandList = container.client.commands.application?.commands.cache;
        const command = (commandList && commandList.find(c => c.name === 'group')) || { id: '0' };

        if (group.isManager(interaction.user.id))
            return void interaction.reply({
                ephemeral: true,
                content:
                    'You are the manager of this group and cannot leave, ' +
                    'you can however transfer ownership to another group member using ' +
                    `</group transfer:${command.id}>.`,
            });

        return group.removeMember(interaction.user.id, interaction);
    }
}
