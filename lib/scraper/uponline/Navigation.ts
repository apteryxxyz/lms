import type Uponline from '.';
import Base from '../Base';

export default class Navigation extends Base {
    /** Uponline handler */
    public uponline: Uponline;

    public constructor(uponline: Uponline) {
        super(uponline.scraper);
        this.uponline = uponline;
    }

    /** Check whether the navigation draw is open */
    public isDrawerOpen(): Promise<boolean> {
        return this.page.evaluate(() => {
            const drawer = document.querySelector('.upds-course-nav');
            if (drawer === null) return false;
            return Boolean(drawer) && drawer.classList.contains('active');
        });
    }

    /** Toggle the navigation drawer */
    public async toggleDrawer(open: boolean): Promise<void> {
        if (open === (await this.isDrawerOpen())) return;
        this.log('Toggling navigation drawer...');
        await this.page.click('[id="nav-draw-button"]');
        await this.page.waitForTimeout(1000);
    }
}
