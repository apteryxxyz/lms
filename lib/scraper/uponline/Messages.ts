import type Uponline from '.';
import Base from '../Base';

export interface Category {
    /** ID of this categories element */
    id: string;
    /** Name of this category */
    name: string;
    /** Whether this group is open */
    isOpen: boolean;
}

export interface Group {
    /** The name of the group */
    name: string;
    /** Whether this 'group' is a trainer */
    isTrainer: boolean;
}

export interface Message {
    /** The author of the message */
    author: string;
    /** The content of the message */
    content: string;
    /** The time this was sent at */
    sentAt: Date;
}

// Message Panel -- [id^='message-drawer-view-overview-container-']

export default class Messages extends Base {
    /** Uponline handler */
    public uponline: Uponline;

    public constructor(uponline: Uponline) {
        super(uponline.scraper);
        this.uponline = uponline;
    }

    /** Check whether the message panel is open */
    public isPanelOpen(): Promise<boolean> {
        return this.page.evaluate(() => {
            const panel = document.querySelector('[data-region="message-drawer"]');
            if (panel === null) return false;
            return !panel.classList.contains('hidden');
        });
    }

    /** Toggle the message panel */
    public async togglePanel(open: boolean): Promise<void> {
        if (open === (await this.isPanelOpen())) return;
        this.log(`Toggling message panel...`);
        await this.page.click('[aria-label="Messaging Button"]');
        await this.page.waitForTimeout(4000);
    }

    /** Get the list of message categories */
    public async getCategoryList(): Promise<Category[]> {
        await this.togglePanel(true);
        const container = await this.page.$('[id^="message-drawer-view-overview-container-"]');
        if (!container) throw new Error('Could not find message groups container');

        const getIds = (e: any) => Array.from(e.children).map((i: any) => i.children[0].id);
        const getNames = (e: any) =>
            Array.from(e.children).map((i: any) => i.textContent.split('\n')[0].trim());
        const getOpens = (e: any) =>
            Array.from(e.children).map((i: any) => i.classList.contains('expanded'));

        const ids = (await container.evaluate(getIds)) as string[];
        const names = (await container.evaluate(getNames)) as string[];
        const opens = (await container.evaluate(getOpens)) as boolean[];

        return ids.map((id, i) => ({ id, name: names[i], isOpen: opens[i] }));
    }

    /** Get the currently opened category */
    public async getOpenedCategory(): Promise<Category | undefined> {
        const categories = await this.getCategoryList();
        return categories.find((c) => c.isOpen);
    }

    /** Toggles a category */
    // If category is undefined, it will close the open category if any
    public async toggleCategory(category?: Category): Promise<void> {
        if (category) {
            const current = await this.getOpenedCategory();
            if (current && current.id === category.id) return;
        } else {
            category = await this.getOpenedCategory();
            if (!category) return;
        }

        this.log(`Toggling ${category.name} category...`);
        const button = await this.page.$(`#${category.id}`);
        if (!button) throw new Error('Could not find category button');

        await button.click();
        await this.page.waitForTimeout(5000);
    }

    /** Gets the list of the groups of the currently opened category */
    public async getGroupList(): Promise<Group[]> {
        const current = await this.getOpenedCategory();
        if (!current) throw new Error('No category is open');
        const parent = await this.page.$('.expanded');
        if (!parent) throw new Error('Could not find message groups container');
        const groups = await parent.$$('.bux_msg_line');
        if (!groups.length) throw new Error('No groups in category found');

        const contents = await Promise.all(groups.map((e) => e.evaluate((i) => i.innerText)));
        const cleaned = contents.map((c) => c.trim().replace(/ {2,}/g, ''));
        const splited = cleaned.map((c) => c.trim().split('\n').filter(Boolean));

        return splited.map((rest) => {
            const name = rest.shift() as string;
            const isTrainer = rest[0] === 'Trainer';
            return { name, isTrainer };
        });
    }

    public async getOpenedGroup(): Promise<Group | undefined> {
        const element = await this.page.$('[data-action="view-group-info"]');
        const offset = await element?.evaluate((e) => e.offsetParent);
        if (!element || !offset) return undefined;

        const [name, isTrainer] = await element
            .evaluate((e) => e.textContent.trim().split(/[\n ]{2,}/))
            .then(([t, i]) => [t, i === 'Trainer']);
        return { name, isTrainer };
    }

    public async toggleGroup(group?: Group): Promise<void> {
        const current = await this.getOpenedGroup();
        if (current && group && current.name === group.name) return;
        else if (!group && !current) return;
        this.log('Toggling group...');

        if (current) {
            // Sometimes can't find back button, so wait an extra 5 seconds in case it hasn't loaded
            await this.page.waitForTimeout(5000);
            const back = await this.page.$('.icon-back-in-drawer');
            if (!back) throw new Error('Could not find back button');
            await back.click();
        }

        if (group) {
            const groups = await this.getGroupList();
            const goto = groups.find((g) => g.name === group.name);
            if (!goto) throw new Error(`Could not find group ${group.name}`);

            const button = await this.page.$x(`//strong[text()="${goto.name}"]`);
            if (!button.length) throw new Error(`Could not find group button ${goto.name}`);
            await button[button.length - 1].click().then(() => this.page.waitForTimeout(10000));
        }
    }

    /** Parse the messages within a message group */
    public async getMessageList(): Promise<Message[]> {
        const containers = await this.page.$$('[data-region="day-container"]');
        const getTextContent = (c: any) => c.evaluate((e: any) => e.textContent);
        const sections = (await Promise.all(containers.map(getTextContent))).map((c) =>
            c
                .split('\n\n')
                .map((s: any) => s.trim())
                .filter(Boolean),
        );

        const messages: Message[] = [];
        for (const section of sections) {
            const date = section.shift();
            for (const content of section) {
                const [author, time, ...rest] = content
                    .split('\n')
                    .map((c: any) => c.trim())
                    .filter((c: any) => Boolean(c));
                const sentAt = new Date(`${date} 2022 ${time}`);
                messages.push({ author, content: rest.join('\n'), sentAt });
            }
        }
        return messages;
    }
}
