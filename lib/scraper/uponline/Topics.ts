import h2m from '@apteryxxyz/html-translator';
import type Uponline from '.';
import Base from '../Base';

export interface Topic {
    /** The index of the topic */
    index: string;
    /** The title of the topic */
    title: string;
    /** Topics within this topic */
    subtopics: Subtopic[];
}

export interface Subtopic {
    /** The index of the subtopic */
    index: string;
    /** The title of the subtopic */
    title: string;
    /** The content of the subtopic */
    content: string;
}

export default class Topics extends Base {
    /** Uponline handler */
    public uponline: Uponline;

    public constructor(uponline: Uponline) {
        super(uponline.scraper);
        this.uponline = uponline;
    }

    public async getTopicList(): Promise<Topic[]> {
        const mod = await this.uponline.modules.getOpenedModule();
        if (!mod) throw new Error('No module opened');

        const button = await this.page.$(`#${mod.id}`);
        if (!button) throw new Error('Module button not found');
        const parent = await button.getProperty('parentNode');
        const parentId = await parent.evaluate((e: any) => e.getAttribute('id'));

        const element = await this.page.$(`#${parentId}`);
        if (!element) throw new Error('Module element not found');
        const list = await element.$$('[class="upds-course-nav__item"]');

        const levelOne = await Promise.all(list.map((e) => e.evaluate((i) => i.innerText)));
        const topLevel = levelOne.filter((i) => Number.parseInt(i.at(0), 10) > 0);
        const levelTwo = await Promise.all(list.map((e) => e.evaluate((i) => i.textContent)));
        const subLevel = levelTwo.filter((s) => s.replace(/[^0-9]/g, '').length === 3);

        const levels = [...topLevel, ...subLevel].sort((a, b) => a.localeCompare(b));
        const topicObjects = levels
            .map((l) => l.trim())
            .map((l) => {
                const ls = l.split(' ');
                const [index, title] = [ls[0], ls.slice(1).join(' ')];
                if (index.length > 3) return null;
                const subtopics = subLevel
                    .filter((s) => s.startsWith(`${index}.`))
                    .filter((s) => s.replace(/[^0-9]/g, '').length === 3);
                return { index, title, subtopics };
            })
            .filter((i) => i !== null) as { index: string; title: string; subtopics: string[] }[];

        const topics = [];
        for (const t of topicObjects) {
            topics.push(await this.getTopicContent(`${t.index} ${t.title}`, t.subtopics));
            await this.page.waitForTimeout(3000);
        }
        return topics;
    }

    public async getTopicContent(topic: string, subtopics: string[]): Promise<Topic> {
        const button = await this.page.$x(`//span[text()="${topic}"]`);
        if (!button) throw new Error(`Topic button not found`);

        await button[0].click();
        await this.page.waitForTimeout(1000);

        const content = await this.page.$('#bux-message');
        if (!content) throw new Error('Topic content not found');
        const html = await content.evaluate((e: any) => e.innerHTML);
        const { markdown } = h2m(html);

        const s = subtopics
            .map((s) => s.split(' ').slice(1).join(' '))
            .map((s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
        const regex = new RegExp(`\\n\\n\\*\\*(${s.join('|')})\\*\\*`, 'g');
        const sections = markdown.split(regex);
        sections.shift();
        const chunks = [...Array(Math.ceil(sections.length / 2))]
            .map((_) => sections.splice(0, 2))
            .map(([n, c]) => [n, c.trim()])
            .filter(([, c]) => c.length > 0);

        const subtopicObjects = chunks.map(([n, c], i) => {
            const index = subtopics[i].split(' ')[0];
            return { index, title: n, content: c.trim() };
        });

        const ts = topic.split(' ');
        const [index, title] = [ts.shift(), ts.join(' ')];
        return { index, title, subtopics: subtopicObjects } as Topic;
    }
}
