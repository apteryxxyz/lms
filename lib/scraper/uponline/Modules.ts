import type Uponline from '.';
import Base from '../Base';

export interface Module {
    /** Module element ID */
    id: string;
    /** The index of the module */
    index: string;
    /** The name of the module */
    name: string;
    /** Whether the module is openable */
    isOpenable: boolean;
    /**  */
    isOpen: boolean;
}

export default class Modules extends Base {
    /** Uponline handler */
    public uponline: Uponline;

    public constructor(uponline: Uponline) {
        super(uponline.scraper);
        this.uponline = uponline;
    }

    public async getModuleList(): Promise<Module[]> {
        await this.uponline.navigation.toggleDrawer(true);

        const getName = (e: any) => e.textContent;
        const getOpenable = (e: any) => !e.getAttribute('title').includes('blocked');
        const getOpen = (e: any) => e.classList.contains('active');

        const els = await this.page.$$('[id^=nav-module-]');
        const ids = await Promise.all(els.map(e => e.evaluate(i => i.getAttribute('id'))));
        const names = await Promise.all(els.map(e => e.evaluate(getName)));
        const openables = await Promise.all(els.map(e => e.evaluate(getOpenable)));
        const opens = await Promise.all(els.map(e => e.evaluate(getOpen)));

        return ids.map((id, i) => {
            let name = names[i];
            const index = Number.parseInt(name.at(0), 10) > 0 ? name.at(0) : '0';
            const isOpenable = openables[i];
            if (index !== '0') name = name.slice(1).trim();
            return { id, index, name, isOpenable, isOpen: opens[i] };
        });
    }

    public async getOpenedModule(): Promise<Module | undefined> {
        const modules = await this.getModuleList();
        return modules.find(m => m.isOpen);
    }

    public async toggleModule(mod?: Module): Promise<void> {
        const current = await this.getOpenedModule();
        if (current && mod && current.id === mod.id) return;
        else if (!mod && !current) return;
        else if (!mod) mod = current as Module;
        this.log(`Toggling module ${mod.name}...`);

        const button = await this.page.$(`#${mod.id}`);
        if (!button) throw new Error('Module not found');

        await button.click();
        await this.page.waitForTimeout(1000);
    }
}
