import cheerio from 'cheerio';
import type Uponline from '.';
import Base from '../Base';

export enum Category {
    Favourites = 'Favourites',
    GroupMessages = 'Group Messages',
    Messages = 'Messages',
}

export interface Group {
    /** The title of the group */
    title: string;
    /** Whether this "group" is a trainer */
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

export default class Messages extends Base {
    /** Uponline handler */
    public uponline: Uponline;
    /** Currently opened category */
    public openedCategory?: Category;
    /** List of visible groups */
    public visibleGroups?: Group[];
    /** Currently opened group */
    public openedGroup?: Group;

    public constructor(uponline: Uponline) {
        super(uponline.client);
        this.uponline = uponline;
    }

    /** Setup the messages panel */
    public async setup(): Promise<void> {
        // Open the messages panel
        await this.page.click('[aria-label="Messaging Button"]');
        await this.page.waitForTimeout(4000);

        this.openedCategory = Category.GroupMessages;
        await this.listGroups();
    }

    /** Reset this handler */
    public async reset(): Promise<void> {
        this.openedCategory = undefined;
        this.visibleGroups = undefined;
        this.openedGroup = undefined;
        return this.setup();
    }

    /** Open a message groups category */
    public async openCategory(category: Category): Promise<void> {
        if (this.openedCategory === category) return;

        this.log(`Opening '${category}' messages category...`);
        const button = await this.page.$x(`//span[text()='${category}']`);
        if (!button.length) throw new Error('Category not found');
        await button[0].evaluate((n) => n.click());
        await this.page.waitForTimeout(2000);

        this.openedCategory = category;
        await this.listGroups();
    }

    /** Produce a list of all groups in the current category */
    public async listGroups(): Promise<Group[]> {
        if (!this.openedCategory) throw new Error('Category not opened');

        let elements = await this.page.$$('[class="bux_msg_line"]');

        // Filter the elements by if they are visible
        // <Element>.offsetParent is null if hidden
        const list = elements.map((e) => e.evaluate((n) => n.offsetParent));
        const offsets = await Promise.all(list);
        elements = elements.filter((_, i) => offsets[i] !== null);

        const promises = elements.map((e) => e.evaluate((e) => e.innerText));
        const texts = await Promise.all(promises);
        const cleaned = texts.map((t) => t.trim().replace(/ {2}/, ''));
        const splited = cleaned.map((t) => t.split('\n').filter(Boolean));

        const groups = splited.map((rest) => {
            const title = rest.shift() as string;
            const isTrainer = rest[0] === 'Trainer';
            return { title, isTrainer };
        });

        this.visibleGroups = groups;
        return groups;
    }

    /** Open a message group */
    public async openGroup(group: Group): Promise<void> {
        if (!this.openedCategory) throw new Error('Category not opened');
        if (this.openedGroup === group) return;

        const query = `//strong[text()='${group.title}']`;
        const element = await this.page.$x(query);
        if (!element.length) throw new Error('Group not found');
        this.log(`Opening '${group.title}' messages group...`);
        await element[element.length - 1].evaluate((n) => n.click());
        await this.page.waitForTimeout(3000);
        this.openedGroup = group;
    }

    /** Close the current message group */
    public async closeGroup(): Promise<void> {
        if (!this.openedGroup) return;
        this.log(`Closing '${this.openedGroup.title}' messages group...`);
        await this.page.click('[aria-label="Back to Messages overview"]');
        await this.page.waitForTimeout(2000);
        this.openedGroup = undefined;
    }

    /** Produce a list of all messages in the current group */
    public async listGroupMessages(): Promise<Message[]> {
        if (!this.openedGroup) throw new Error('Group not opened');
        const containers = await this.page.$$('[data-region="day-container"]');

        const messages = await Promise.all(
            containers.map(async (day) => {
                const html = await day.evaluate((e) => e.innerHTML);
                const $ = cheerio.load(html);

                const date = $('h6').first().text();
                const messages = Array.from($('.message'))
                    .map((d) =>
                        d.children
                            .filter((e) => e.type === 'tag')
                            .filter((e) => e.children.length > 0),
                    )
                    .map((o) => this.parseSingleMessage(date, o));

                return messages;
            }),
        );

        return messages.flat();
    }

    /** Parse the content of a single message */
    private parseSingleMessage(date: string, [header, body]: any[]): Message {
        const [author, time] = Reflect.get(
            cheerio,
            'text',
        )(header.children)
            .trim()
            .split('\n')
            .map((s: any) => s.trim())
            .filter((s: any) => s.length > 0);
        const content = Reflect.get(cheerio, 'text')(body.children).trim();
        const sentAt = new Date(`${date} 2022 ${time}`);
        return { author, content, sentAt };
    }
}
