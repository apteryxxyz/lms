import { Base } from '../Base';
import type { Uponline } from './Uponline';

export interface Category {
    /** ID of this categories element. */
    id: string;
    /** Name of this category. */
    name: string;
    /** Whether this category is open. */
    isOpen: boolean;
    /** The number of conversation within this category. */
    conversationCount: number;
}

export interface Conversation {
    /** ID of the conversation. */
    id: string;
    /** The name of the conversation. */
    name: string;
    /** Whether this 'conversation' is a trainer. */
    isTrainer: boolean;
}

export interface Message {
    /** ID of the message. */
    id: string;
    /** The author of the message. */
    author: string;
    /** The content of the message. */
    content: string;
    /** The time this was sent at. */
    sentAt: Date;
}

export class Messages extends Base {
    /** Reference to the Uponline handler. */
    public uponline: Uponline;

    public constructor(uponline: Uponline) {
        super(uponline.client);
        this.uponline = uponline;
    }

    /** Check whether the message panel is open. */
    public isPanelOpen(): Promise<boolean> {
        return this.page.evaluate(() => {
            const selector = '[data-region="message-drawer"]';
            const panel = document.querySelector(selector);
            if (panel === null) return false;
            return !panel.classList.contains('hidden');
        });
    }

    /** Open the message panel. */
    public async openPanel() {
        if (await this.isPanelOpen()) return;

        this.logger.info('Opening message panel...');
        await this.page.click('[aria-label="Messaging Button"]');
        await this.page.waitForNetworkIdle();
    }

    /** Close the message panel. */
    public async closePanel() {
        if (!(await this.isPanelOpen())) return;

        this.logger.info('Closing message panel...');
        await this.page.click('[aria-label="Messaging Button"]');
        await this.page.waitForNetworkIdle();
    }

    /** Get the list of message categories. */
    public async getCategories(): Promise<Category[]> {
        await this.openPanel();

        const selector = '[id^="message-drawer-view-overview-container-"]';
        const container = await this.page.$(selector);
        if (!container)
            throw new Error('Could not find message groups container');

        const getItems = (element: any) =>
            Array.from(element.children).map((child: any) => ({
                id: child.children[0].id,
                name: child.textContent.split('\n')[0].trim(),
                isOpen: child.classList.contains('expanded'),
                conversationCount: Number(
                    child.textContent.match(/\((\d+)\)/)[1]
                ),
            }));

        return container.evaluate(getItems);
    }

    /** Get the currently opened category. */
    public async getOpenedCategory() {
        const categories = await this.getCategories();
        return categories.find(category => category.isOpen);
    }

    /** Open a messages category. */
    public async openCategory(category: Category) {
        const current = await this.getOpenedCategory();
        if (current?.id === category.id) return;
        if (current) await this.closeCategory();

        this.logger.info(`Opening category ${category.name}...`);
        const button = await this.page.$(`#${category.id}`);
        if (!button) throw new Error('Could not find category button');

        await button.click();
        await this.page.waitForNetworkIdle();
    }

    /** Close the currently opened category. */
    public async closeCategory() {
        const category = await this.getOpenedCategory();
        if (!category) return;

        this.logger.info(`Closing category ${category.name}...`);
        const button = await this.page.$(`#${category.id}`);
        if (!button) throw new Error('Could not find category button');

        await button.click();
        await this.page.waitForNetworkIdle();
    }

    /** Get the list of conversations in the current category. */
    public async getConversations(): Promise<Conversation[]> {
        const parent = await this.page.$('.expanded');
        if (!parent)
            throw new Error('Could not find conversation list container');

        const conversations = await parent.$$('a[data-conversation-id]');
        if (!conversations.length) throw new Error('No conversations found');

        return Promise.all(
            conversations.map(async conversation =>
                conversation.evaluate((element: any) => {
                    const contents = element.innerText.split('\n\n');
                    return {
                        id: element.dataset.conversationId,
                        name: contents[0].trim(),
                        isTrainer: contents[1].trim() === 'Trainer',
                    };
                })
            )
        );
    }

    /** Get the currently opened category. */
    public async getOpenedConversation(): Promise<
        Omit<Conversation, 'id'> | undefined
    > {
        const element = await this.page.$('[data-action="view-group-info"]');
        const offset = await element?.evaluate((el: any) => el.offsetParent);
        if (!element || !offset) return;

        const [name, isTrainer] = await element
            .evaluate((el: any) => el.textContent.trim().split(/[\n ]{2,}/))
            .then(([name, subtext]) => [name, subtext === 'Trainer']);

        return { name, isTrainer };
    }

    /** Open a conversation. */
    public async openConversation(conversation: Conversation) {
        const current = await this.getOpenedConversation();
        if (current?.name === conversation.name) return;
        if (current) await this.closeConversation();

        this.logger.info(`Opening conversation ${conversation.name}...`);
        const selector = `a[data-conversation-id="${conversation.id}"]`;
        const button = await this.page.$(selector);
        if (!button) throw new Error('Could not find conversation button');

        await button.click();
        await this.page.waitForNetworkIdle();
    }

    /** Close the currently opened conversation. */
    public async closeConversation() {
        const current = await this.getOpenedConversation();
        if (!current) return;

        this.logger.info(`Closing conversation ${current.name}...`);
        const selector = '[aria-label="Back to Messages overview"]';
        const button = await this.page.$(selector);
        if (!button) throw new Error('Could not find back button');

        await button.click();
        await this.page.waitForNetworkIdle();
    }

    public async getMessages() {
        this.logger.info('Getting conversation messages...');

        const selector = '[data-region="day-container"]';
        const containers = await this.page.$$(selector);
        const parsedMessages: Message[] = [];

        for (const container of containers) {
            const date = await container.$eval('h6', e => e.innerText);
            const messages = await container.$$('[data-region="message"]');

            for (const message of messages) {
                const [id, author, time, content] = await message.evaluate(
                    (element: any) => {
                        return [
                            element.dataset.messageId,
                            element.querySelector('h6')?.innerText,
                            element.querySelector('.text-muted')?.innerText,
                            element.querySelector('div[dir="auto"]')?.innerText,
                        ] as string[];
                    }
                );

                const sentAt = new Date(`${date} 2023 ${time}`);
                parsedMessages.push({ id, author, content, sentAt });
            }
        }

        return parsedMessages;
    }
}
