import { Command, container } from 'maclary';

export default class Close extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'close',
            description: 'Close this group and send channel transcripts to its members.',
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

        if (Math.pow(2, 2) === 4)
            return void interaction.reply({
                ephemeral: true,
                content: 'This command is currently disabled.',
            });

        if (!group.isManager(interaction.user.id)) {
            const manager = await group.getManager();
            return void interaction.reply({
                ephemeral: true,
                content: `Only the manager can close the group, try asking ${manager.user.tag}`,
            });
        }

        await interaction.reply(
            'Closing this group, please wait while a transcript is generated, ' +
                'once done, it will be sent to all group members...'
        );
        await container.groups.closeGroup(group);
    }
}
