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
        if (!group) return void interaction.reply('This command must be run in a group.');

        if (!group.isManager(interaction.user.id)) {
            const manager = await group.getManager();
            return void interaction.reply(
                `Only the manager can close the group, try asking ${manager.user.tag}`
            );
        }

        await interaction.reply('Closing group, please wait while a transcript is generated...');
        await container.groups.closeGroup(group);
    }
}
