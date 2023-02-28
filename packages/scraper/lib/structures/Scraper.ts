import EventEmitter from 'node:events';
import { setTimeout } from 'node:timers';
import type { Job } from 'node-schedule';
import { scheduleJob } from 'node-schedule';
import { Client } from './Client';
import * as Database from '~/Database';

export const Events = {
    ConversationMessageCreate: 'conversationMessageCreate',
};

export class Scraper extends EventEmitter {
    public readonly options: Scraper.Options;
    public client: Client;
    public job!: Job;

    public constructor(options: Scraper.Options) {
        super();

        this.options = options;
        this.client = new Client(options);
    }

    public async process() {
        await this.client.launchBrowser();
        await this.client.launchPage();

        await this.client.uponline.login();
        await this._checkMessages();

        await this.client.closePage();
        await this.client.closeBrowser();
    }

    private async _checkMessages() {
        const messages = this.client.uponline.messages;

        await messages.openPanel();
        const categories = await messages.getCategories();
        const categoryName = this.options.categoryName;
        const category = categories.find(cat => cat.name === categoryName);
        if (!category) throw new Error(`Category ${categoryName} not found`);
        await messages.openCategory(category);

        const conversations = await messages.getConversations();
        const conversationId = this.options.conversationId;
        const conversation = conversations.find(co => co.id === conversationId);
        if (!conversation)
            throw new Error(`Category ${conversationId} not found`);
        await messages.openConversation(conversation);

        const dmMessages = await Database.getMessages(conversation);
        const upMessages = await messages.getMessages();
        await Database.saveMessages(conversation, upMessages);

        await messages.closeConversation();
        await messages.closePanel();

        const newMessages = upMessages.filter(upMsg => {
            return !dmMessages.some(dmMsg => dmMsg.id === upMsg.id);
        });
        if (!newMessages.length) return;

        for (const message of newMessages) {
            const handlers = this.listeners(Events.ConversationMessageCreate);

            for (const handler of handlers) {
                await Promise.resolve(() => setTimeout(() => {}, 10_000));
                await handler(conversation, message);
            }
        }
    }

    public start(cronExpression: string) {
        this.job = scheduleJob(cronExpression, () => this.process());
    }
}

export namespace Scraper {
    export interface Options extends Client.Options {
        categoryName: string;
        conversationId: string;
    }
}
