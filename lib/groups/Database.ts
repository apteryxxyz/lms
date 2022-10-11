import fs from 'fs-extra';
import Group from './Group';

async function readFile(path: string, def: string): Promise<string> {
    path = path.replace(/=/g, '');
    await fs.ensureFile(path);
    return fs.readFile(path, 'utf8').then(d => d || def);
}

async function writeFile(path: string, data: string): Promise<void> {
    path = path.replace(/=/g, '');
    await fs.ensureFile(path);
    await fs.writeFile(path, data);
}

export default class Database extends null {
    /** Get the list of groups */
    public static async getGroups(): Promise<Group[]> {
        const content = await readFile('data/groups.json', '[]');
        const json = JSON.parse(content) as ReturnType<Group['toJSON']>[];
        return json.map(g => new Group(g));
    }

    /** Stringify and save a list of groups */
    public static async saveGroups(groups: Group[]): Promise<void> {
        const content = JSON.stringify(groups, null, 4);
        await writeFile('data/groups.json', content);
    }
}
