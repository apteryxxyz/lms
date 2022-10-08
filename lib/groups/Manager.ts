import { AttachmentBuilder, CategoryChannel, Snowflake } from 'discord.js';
import { container } from 'maclary';
import { resolve as pathResolve } from 'node:path';
import { execSync as cpExec } from 'node:child_process';
import Database from './Database';
import Group, { JoinStatus } from './Group';

const CategoryId = process.env.GROUPS_CATEGORY_ID as string;

export interface CreateGroupOptions {
    name: string;
    description: string;
    joinStatus: JoinStatus;
    memberLimit: number;
}

export default class GroupManager {
    private _groups: Group[] = [];

    /** Initialise all the existing groups */
    public async initialise() {
        this._groups = await Database.getGroups();
    }

    /** Sync memory and JSON */
    public async save() {
        await Database.saveGroups(this._groups);
    }

    /** Get the channel group for all groups */
    public getGroupsCategory() {
        return container.client.channels.fetch(CategoryId) as Promise<CategoryChannel>;
    }

    /** Get a list of open groups */
    public getGroups() {
        return this._groups.filter(g => !g.finishedAt);
    }

    /** Get a group by its ID */
    public getGroupById(id: string | number) {
        if (typeof id === 'string') id = Number.parseInt(id);
        return this.getGroups().find(g => g.id === id);
    }

    /** Get all the groups a user managers */
    public getGroupsByManagerId(userId: string) {
        return this.getGroups().filter(g => g.isManager(userId));
    }

    /** Get all the groups a user is a member of */
    public getGroupsByMemberId(userId: string) {
        return this.getGroups().filter(g => g.isMember(userId));
    }

    /** Create a brand new group */
    public async createGroup(
        managerId: Snowflake,
        { name, description, joinStatus, memberLimit }: CreateGroupOptions
    ) {
        const id = this._groups.length;

        const groupData = { id, managerId, name, description, joinStatus, memberLimit };
        const group = new Group(groupData);
        this._groups.push(group);

        // Make groups private channels and send joiner and welcome messages
        const groupsCategory = await this.getGroupsCategory();
        await group.setupChannels(groupsCategory);
        await group.setupMessages();

        this.save();
        return group;
    }

    /** Close a group */
    public async closeGroup(group: Group) {
        // Generate a transcript of the groups text channel
        const execPath = pathResolve('external/chat-exporter/DiscordChatExporter.Cli.dll');
        const outPath = pathResolve(`output/${group.textId}.html`);
        const command = `dotnet ${execPath} export -c ${group.textId} -t ${process.env.DISCORD_TOKEN} -o ${outPath}`;
        cpExec(command);

        // Send the transcript to each member of the group
        const transcript = new AttachmentBuilder(outPath, { name: `group-${group.id}.html` });
        const manager = await group.getManager();
        const members = await group.getMembers();
        for (const member of [manager, ...members])
            member.send({
                content:
                    `Here is your transcript of group '${group.name}' (#${group.id}), ` +
                    `from ${new Date(group.createdAt).toLocaleDateString()} to ` +
                    `${new Date().toLocaleDateString()}.  Download the HTML file and open it in your web browser.`,
                files: [transcript],
            });

        // Delete the groups channels
        group.getTextChannel().then(c => c.delete());
        group.getVoiceChannel().then(c => c.delete());
        group.getJoinerMessage().then(m => (m ? m.delete() : null));

        group.finishedAt = Date.now();
        this.save();
        return group;
    }
}
