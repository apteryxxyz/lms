import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, userMention } from '@discordjs/builders';
import {
    ApplicationCommand,
    ApplicationCommandManager,
    ButtonStyle,
    CategoryChannel,
    CategoryCreateChannelOptions,
    ChannelType,
    Interaction,
    Message,
    OverwriteData,
    OverwriteType,
    PermissionFlagsBits,
    Snowflake,
    TextChannel,
    User,
    VoiceChannel,
} from 'discord.js';
import { container } from 'maclary';

const GuildId = process.env.GROUPS_GUILD_ID as string;
const ChannelId = process.env.GROUPS_CHANNEL_ID as string;

export enum JoinStatus {
    AnyoneCan,
    InviteOnly,
    Closed,
}

export interface NewGroupData {
    id: number;
    name: string;
    description: string;

    managerId: Snowflake;
    joinStatus: JoinStatus;
    memberLimit: number;
}

export interface ExistingGroupData extends NewGroupData {
    textId: Snowflake;
    voiceId: Snowflake;
    joinerId: Snowflake;
    welcomeId: Snowflake;

    memberIds: Snowflake[];
    joinRequests: JoinRequest[];
    createdAt: number;
    finishedAt?: number;
}

export interface JoinRequest {
    userId: Snowflake;
    messageId: Snowflake;
    confirmedById?: Snowflake;
    confirmStatus?: RequestStatus;
}

export enum RequestStatus {
    Accepted,
    Rejected,
}

function isExistingGroupData(data: NewGroupData | ExistingGroupData): data is ExistingGroupData {
    return 'memberIds' in data;
}

export default class Group {
    public id!: number;
    public name!: string;
    public description!: string;

    public managerId!: Snowflake;
    public memberLimit!: number;
    public joinStatus: JoinStatus;
    public memberIds: Snowflake[] = [];
    public joinRequests: JoinRequest[] = [];

    public createdAt: number = Date.now();
    public finishedAt?: number = undefined;

    public textId!: Snowflake;
    public voiceId!: Snowflake;
    public joinerId!: Snowflake;
    public welcomeId!: Snowflake;

    public constructor(data: NewGroupData | ExistingGroupData) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;

        this.managerId = data.managerId;
        this.joinStatus = data.joinStatus;
        this.memberLimit = data.memberLimit;

        if (isExistingGroupData(data)) {
            this.textId = data.textId;
            this.voiceId = data.voiceId;
            this.joinerId = data.joinerId;
            this.welcomeId = data.welcomeId;

            this.memberIds = data.memberIds;
            this.createdAt = data.createdAt;
            this.finishedAt = data.finishedAt;
        }
    }

    /** Check if a user is the manager of this group */
    public isManager(userId: Snowflake) {
        return userId === this.managerId;
    }

    /** Check if a user is a member of this group */
    public isMember(userId: Snowflake) {
        return this.memberIds.indexOf(userId) >= 0;
    }

    /** Check if a user has requested to join */
    public isPendingRequest(userId: Snowflake) {
        return this.joinRequests.findIndex(r => r.userId === userId && !r.confirmedById) >= 0;
    }

    /** Save the group */
    public save() {
        container.groups.save();
    }

    /** Get the guild this group is in */
    public getGuild() {
        return container.client.guilds.fetch(GuildId);
    }

    /** Get the manager of this group */
    public getManager() {
        return this.getGuild().then(g => g.members.fetch(this.managerId));
    }

    /** Get the members of this group */
    public async getMembers() {
        return this.getGuild()
            .then(g => g.members.fetch({ user: this.memberIds }))
            .then(m => Array.from(m.values()));
    }

    /** Get the text channel that belongs to this group */
    public getTextChannel() {
        return container.client.channels.fetch(this.textId) as Promise<TextChannel>;
    }

    /** Get the voice channel that belongs to this group */
    public getVoiceChannel() {
        return container.client.channels.fetch(this.voiceId) as Promise<VoiceChannel>;
    }

    /** Get the group list channel */
    public getGroupListChannel() {
        return container.client.channels.fetch(ChannelId) as Promise<TextChannel>;
    }

    /** Get this groups joiner message in the group list channel */
    public getJoinerMessage() {
        return this.getGroupListChannel() //
            .then(c => c.messages.fetch(this.joinerId)) as Promise<Message<true>>;
    }

    /** Get this groups welcome message, in the groups text channel */
    public getWelcomeMessage() {
        return this.getTextChannel() //
            .then(c => c.messages.fetch(this.welcomeId)) as Promise<Message<true>>;
    }

    /** Transfer ownership of this group to another member */
    public async setManager(userId: Snowflake, replyTo?: Interaction & { reply: any }) {
        if (this.managerId === userId) return;

        const memberIndex = this.memberIds.indexOf(userId);
        this.memberIds.splice(memberIndex, 1);

        this.memberIds.push(this.managerId);
        this.managerId = userId;

        if (replyTo) replyTo.reply(`**${userMention(userId)} is this groups new manager!**`);
        else {
            const channel = await this.getTextChannel();
            void channel.send(`**${userMention(userId)} is this groups new manager!**`);
        }

        await this.updatePermissions();
        await this.updateMessages();
        this.save();
    }

    /** Change and save the groups name */
    public async setName(name: string) {
        if (this.name === name) return;
        this.name = name;
        await this.updateMessages();
        this.save();
    }

    /** Change and save the groups description */
    public async setDescription(description: string) {
        if (this.description === description) return;
        this.description = description;
        await this.updateMessages();
        this.save();
    }

    /** Change and save the groups member limit */
    public async setMemberLimit(limit: number) {
        if (this.memberLimit === limit) return;
        this.memberLimit = limit;
        await this.updateMessages();
        this.save();
    }

    /** Change and save the groups join status */
    public async setJoinStatus(status: JoinStatus) {
        if (this.joinStatus === status) return;
        this.joinStatus = status;
        await this.updateMessages();
        this.save();
    }

    /** Create this groups private channels */
    public async setupChannels(category: CategoryChannel) {
        const creator = category.children.create.bind(category.children);
        const createOptions = await this._makeCreateChannelOptions();
        const textChannel = await creator({ ...createOptions, type: ChannelType.GuildText });
        const voiceChannel = await creator({ ...createOptions, type: ChannelType.GuildVoice });

        this.textId = textChannel.id;
        this.voiceId = voiceChannel.id;
    }

    /** Send this groups joiner and welcome messages */
    public async setupMessages() {
        const groupsChannel = await this.getGroupListChannel();
        const joinerOptions = await this._makeJoinerMessageOptions();
        const joinerMessage = await groupsChannel.send(joinerOptions);

        this.joinerId = joinerMessage.id;

        const textChannel = await this.getTextChannel();
        const welcomeOptions = await this._makeWelcomeMessageOptions();
        const welcomeMessage = await textChannel.send(welcomeOptions);

        welcomeMessage.pin();

        this.welcomeId = welcomeMessage.id;
    }

    /** Update the groups joiner and welcome messages */
    public async updateMessages() {
        const joinerMessage = await this.getJoinerMessage();
        const joinerOptions = await this._makeJoinerMessageOptions();
        await joinerMessage.edit(joinerOptions);

        const welcomeMessage = await this.getWelcomeMessage();
        const welcomeOptions = await this._makeWelcomeMessageOptions();
        await welcomeMessage.edit(welcomeOptions);
    }

    /** Update the permissions of this groups private channels */
    public async updatePermissions() {
        const permissions = await this._makeChannelPermissions();

        const textChannel = await this.getTextChannel();
        textChannel.permissionOverwrites.set(permissions);

        const voiceChannel = await this.getVoiceChannel();
        voiceChannel.permissionOverwrites.set(permissions);
    }

    /** Add a member to this group */
    public async addMember(userId: Snowflake, replyTo?: Interaction & { reply: any }) {
        this.memberIds.push(userId);

        if (replyTo) replyTo.reply(`**${userMention(userId)} joined the group!**`);
        else {
            const channel = await this.getTextChannel();
            void channel.send(`**${userMention(userId)} joined the group!**`);
        }

        await this.updatePermissions();
        await this.updateMessages();
        this.save();
    }

    /** Send a join request to this groups text channel */
    public async addRequest(userId: Snowflake, message: string) {
        const user = await container.client.users.fetch(userId);
        const textChannel = await this.getTextChannel();
        const requestOptions = await this._makeRequestMessageOptions(user, message);
        const confirmMessage = await textChannel.send(requestOptions);

        this.joinRequests.push({ userId, messageId: confirmMessage.id });
        this.save();
    }

    /** Accept or reject a join request */
    public async confirmRequest(
        messageId: Snowflake,
        confirmedById: Snowflake,
        confirmStatus: RequestStatus
    ) {
        const request = this.joinRequests.find(r => r.messageId === messageId);
        if (!request) return;

        const textChannel = await this.getTextChannel();
        const confirmMessage = await textChannel.messages.fetch(request.messageId);
        if (!confirmMessage) return;

        const isA = confirmStatus === RequestStatus.Accepted;
        const footer = `**${isA ? 'Accepted by' : 'Rejected by'} ${userMention(confirmedById)}**`;
        const embed = confirmMessage.embeds[0];
        Reflect.set(embed.data, 'description', [embed.description, footer].join('\n\n'));
        Reflect.set(embed.data, 'color', isA ? 0x00ff00 : 0xff0000);

        const user = (await container.client.users.fetch(request.userId)) as User;
        user.send(
            `Your request to join group ${this.name} has been` +
                ` ${isA ? 'accepted' : 'rejected'}.`
        );

        confirmMessage.edit({ embeds: [embed], components: [] });
        request.confirmedById = confirmedById;
        request.confirmStatus = confirmStatus;
        this.save();
    }

    /** Remove a member to this group */
    public async removeMember(userId: Snowflake, replyTo?: Interaction & { reply: any }) {
        const index = this.memberIds.indexOf(userId);
        if (index === -1) return;
        this.memberIds.splice(index, 1);

        if (replyTo) replyTo.reply(`**${userMention(userId)} left the group!**`);
        else {
            const channel = await this.getTextChannel();
            void channel.send(`**${userMention(userId)} left the group!**`);
        }

        await this.updatePermissions();
        await this.updateMessages();
        this.save();
    }

    public toJSON(): ExistingGroupData {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            managerId: this.managerId,
            joinStatus: this.joinStatus,
            memberLimit: this.memberLimit,
            joinRequests: this.joinRequests,
            memberIds: this.memberIds,
            createdAt: this.createdAt,
            finishedAt: this.finishedAt,
            textId: this.textId,
            voiceId: this.voiceId,
            joinerId: this.joinerId,
            welcomeId: this.welcomeId,
        };
    }

    private async _makeCreateChannelOptions(): Promise<CategoryCreateChannelOptions> {
        const manager = await this.getManager();
        return {
            name: `group-${this.id}`,
            reason: `New group created by ${manager.user.tag}`,
            permissionOverwrites: await this._makeChannelPermissions(),
        };
    }

    private async _makeChannelPermissions(): Promise<OverwriteData[]> {
        const guild = await this.getGuild();

        return [
            {
                id: guild.id,
                type: OverwriteType.Role,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            ...[this.managerId, ...this.memberIds].map(memberId => ({
                id: memberId,
                type: OverwriteType.Member,
                allow: [PermissionFlagsBits.ViewChannel],
            })),
        ];
    }

    private async _makeJoinerMessageOptions() {
        const manager = await this.getManager();
        const members = await this.getMembers();

        const isAnyoneCan = this.joinStatus === JoinStatus.AnyoneCan;
        const isInviteOnly = this.joinStatus === JoinStatus.InviteOnly;
        const isClosed = this.joinStatus === JoinStatus.Closed;

        const availableSpots = isClosed ? 0 : this.memberLimit - (members.length + 1);
        const isFull = availableSpots === 0 || members.length + 1 === this.memberLimit;

        const row = new ActionRowBuilder<ButtonBuilder>().setComponents([
            new ButtonBuilder()
                .setLabel(`${availableSpots} Available Spot${availableSpots === 1 ? '' : 's'}`)
                .setCustomId(`groups,_,${isFull}`)
                .setStyle(isFull || isClosed ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel(isAnyoneCan ? 'Join' : isInviteOnly ? 'Request' : 'Closed')
                .setCustomId(`groups,${this.id},${isInviteOnly ? 'request' : 'join'}`)
                .setDisabled(isFull)
                .setStyle(ButtonStyle.Primary),
        ]);

        const embed = new EmbedBuilder()
            .setTitle(this.name)
            .setDescription(this.description)
            .setTimestamp()
            .setColor(0xffffff)
            .setFooter({
                text: `Group ID: ${this.id}`,
            })
            .addFields([
                {
                    name: 'Manager',
                    value: manager.toString(),
                },
                {
                    name: 'Members',
                    value: members.length > 0 ? members.join(', ') : 'No additional members',
                },
            ]);

        return { embeds: [embed], components: [row] };
    }

    private async _makeWelcomeMessageOptions() {
        const commands = container.client.commands.application
            ?.commands as ApplicationCommandManager;
        const command = commands.cache.find(c => c.name === 'group') as ApplicationCommand;
        const group = (name: string) => `</group ${name}:${command.id}>`;

        const isAnyoneCan = this.joinStatus === JoinStatus.AnyoneCan;
        const isInviteOnly = this.joinStatus === JoinStatus.InviteOnly;
        const joinStatus = isAnyoneCan
            ? 'anyone can join'
            : isInviteOnly
            ? 'anyone can request to join'
            : 'no one can join';

        const embed = new EmbedBuilder()
            .setTitle('Welcome to your new group!')
            .setTimestamp()
            .setColor(0xffffff)
            .addFields([
                {
                    name: 'Group Name & Description',
                    value:
                        'The name and description of this group can be changed using the ' +
                        `${group('name')} and ${group('description')} commands.`,
                },
                {
                    name: 'Managing Members',
                    value:
                        `Currently ${joinStatus}, change this using ${group('status')}.\n` +
                        `If any member would like to leave, they can use ${group('leave')}.\n` +
                        `Members can be added and removed using ${group('add')} and ` +
                        `${group('remove')}.\nThe current member limit is ${this.memberLimit}, ` +
                        `it can be changed using ${group('limit')}.\n`,
                },
                {
                    name: 'Closing the Group',
                    value:
                        'When you have finished what you need to do as a group, you can close ' +
                        `the group by using the command ${group('close')}, this will send the ` +
                        'group members with a transcript in HTML format for your own reference' +
                        '/notes. This can be opened in your web browser.',
                },
            ]);

        return { embeds: [embed] };
    }

    private async _makeRequestMessageOptions(user: User, message: string) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
            })
            .setTitle('New Join Request')
            .setDescription(message)
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().setComponents([
            new ButtonBuilder()
                .setLabel('Accept')
                .setCustomId(`groups,${this.id},accept,${user.id}`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setLabel('Reject')
                .setCustomId(`groups,${this.id},reject,${user.id}`)
                .setStyle(ButtonStyle.Danger),
        ]);

        return { embeds: [embed], components: [row] };
    }
}
