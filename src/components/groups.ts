import { Component, container } from 'maclary';
import { TextInputStyle } from 'discord.js';
import {
    ActionRowBuilder,
    channelMention,
    ModalBuilder,
    TextInputBuilder,
    userMention,
} from '@discordjs/builders';
import { JoinStatus, RequestStatus } from '@groups/Group';

export default class Groups extends Component {
    public constructor() {
        super({ id: 'groups' });
    }

    public override async onButton(button: Component.Button) {
        let [, command] = button.customId.split(',');

        if (command === 'create') {
            const actionRows = [
                new TextInputBuilder()
                    .setLabel('Group Name (Optional)')
                    .setCustomId('name')
                    .setRequired(false)
                    .setPlaceholder(`Defaults to ${button.user.tag}'s Group`)
                    .setMaxLength(100)
                    .setStyle(TextInputStyle.Short),
                new TextInputBuilder()
                    .setLabel('Group Description')
                    .setCustomId('description')
                    .setPlaceholder(
                        'Mention what assignment this group is for, ' +
                            'and what times you will be available...'
                    )
                    .setMaxLength(500)
                    .setStyle(TextInputStyle.Paragraph),
                new TextInputBuilder()
                    .setLabel('Member Limit (Number)')
                    .setCustomId('limit')
                    .setPlaceholder('Any number from 1 to 9')
                    .setMaxLength(1)
                    .setStyle(TextInputStyle.Short),
                new TextInputBuilder()
                    .setLabel('Join Status (Optional)')
                    .setCustomId('status')
                    .setRequired(false)
                    .setPlaceholder('Defaults to anyone can join')
                    .setMaxLength(1)
                    .setStyle(TextInputStyle.Short),
            ].map(t => new ActionRowBuilder<TextInputBuilder>().setComponents([t]));

            return void button.showModal(
                new ModalBuilder()
                    .setTitle('Create A New Group')
                    .setCustomId('groups,create')
                    .setComponents(actionRows)
            );
        }

        if (command === '_') {
            const isFull = button.customId.split(',')[2] === 'true';

            return void button.reply({
                ephemeral: true,
                content: isFull
                    ? 'https://tenor.com/view/sad-walk-away-tiger-gif-13828540'
                    : 'https://tenor.com/view/fat-guy-dancing-moves-gif-14156580',
            });
        }

        const groupId = command;
        const userId = button.user.id;
        [, , command] = button.customId.split(',');
        const group = container.groups.getGroupById(groupId);
        if (!group) return;

        if (command === 'join' || command === 'request') {
            if (group.isManager(userId) || group.isMember(userId))
                return void button.reply({
                    ephemeral: true,
                    content: 'You are already a member of this group!',
                });

            if (command === 'join') {
                await group.addMember(button.user.id);
                return void button.reply({
                    ephemeral: true,
                    content: `You have been added to ${channelMention(group.textId)}`,
                });
            }

            if (group.isPendingRequest(userId))
                return void button.reply({
                    ephemeral: true,
                    content: 'You have already sent a request to join this group, please wait.',
                });

            if (command === 'request') {
                const actionRows = [
                    new TextInputBuilder()
                        .setLabel('Message')
                        .setCustomId('message')
                        .setPlaceholder(
                            'Hello, I would like to join your group, I am available at...'
                        )
                        .setMaxLength(500)
                        .setStyle(TextInputStyle.Paragraph),
                ].map(t => new ActionRowBuilder<TextInputBuilder>().setComponents([t]));

                return void button.showModal(
                    new ModalBuilder()
                        .setTitle('Request To Join')
                        .setCustomId(`groups,${groupId},request`)
                        .setComponents(actionRows)
                );
            }
        }

        if (command === 'accept' || command === 'reject') {
            const pendingId = button.customId.split(',')[3];

            if (group.isMember(pendingId)) {
                await button.message.edit({ components: [] });
                return void button.reply('User is already a member of this group.');
            }

            if (command === 'accept') {
                await group.confirmRequest(button.message.id, userId, RequestStatus.Accepted);
                return group.addMember(pendingId, button);
            }

            if (command === 'reject') {
                await group.confirmRequest(button.message.id, userId, RequestStatus.Rejected);
                return void button.reply(
                    `${userMention(userId)} rejected ${userMention(userId)}'s join request.`
                );
            }
        }

        return void 0;
    }

    public override async onModalSubmit(
        modal: Component.ModalSubmit | Component.MessageModalSubmit
    ) {
        let [, command] = modal.customId.split(',');

        if (command === 'create') {
            const name = modal.fields.getTextInputValue('name') || `${modal.user.tag}'s Group`;
            const description = modal.fields.getTextInputValue('description');
            const memberLimit = Number.parseInt(modal.fields.getTextInputValue('limit'));
            const statusString = (modal.fields.getTextInputValue('status') || 'A').toLowerCase();

            if (Number.isNaN(memberLimit) || memberLimit < 1 || memberLimit > 9)
                return void modal.reply({
                    ephemeral: true,
                    content: 'Member limit should be a number from 1 to 9, please try again.',
                });

            if (!['a', 'i', 'c'].includes(statusString))
                return void modal.reply({
                    ephemeral: true,
                    content: 'Join status must be one of the following: a, i, c. Please try again.',
                });

            const joinStatus =
                statusString === 'a'
                    ? JoinStatus.AnyoneCan
                    : statusString === 'i'
                    ? JoinStatus.InviteOnly
                    : JoinStatus.Closed;
            const groupData = { name, description, joinStatus, memberLimit };
            await modal.deferReply({ ephemeral: true });
            const group = await container.groups.createGroup(modal.user.id, groupData);

            return void modal.editReply(`You have created ${channelMention(group.textId)}!`);
        }

        const groupId = command;
        [, , command] = modal.customId.split(',');
        const group = container.groups.getGroupById(groupId);
        if (!group) return;

        if (command === 'request') {
            const message = modal.fields.getTextInputValue('message');
            await group.addRequest(modal.user.id, message);

            return void modal.reply({
                ephemeral: true,
                content: `Sent request to join ${group.name}.`,
            });
        }

        return void 0;
    }
}
