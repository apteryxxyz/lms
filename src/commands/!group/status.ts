import { JoinStatus } from '@groups/Group';
import { Command, container } from 'maclary';

export default class Leave extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash],
            name: 'status',
            description: 'Change the join status of this group.',
            options: [
                {
                    type: Command.OptionType.Number,
                    name: 'status',
                    description: 'Join status',
                    required: true,
                    choices: [
                        {
                            name: 'Anyone Can Join',
                            value: JoinStatus.AnyoneCan,
                        },
                        {
                            name: 'Invite Only',
                            value: JoinStatus.InviteOnly,
                        },
                        {
                            name: 'Closed',
                            value: JoinStatus.Closed,
                        },
                    ],
                },
            ],
        });
    }

    public override async onChatInput(interaction: Command.ChatInput): Promise<void> {
        const groupList = container.groups.getGroups();
        const group = groupList.find(g => g.textId === interaction.channelId);
        if (!group) return void interaction.reply('This command must be run in a group.');

        const status = interaction.options.getNumber('status', true);
        void group.setJoinStatus(status);
        return void interaction.reply('Successfully changed the join status of the group.');
    }
}
