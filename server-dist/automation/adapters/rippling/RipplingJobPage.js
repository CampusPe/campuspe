import { ripplingSelectors } from './selectors.js';
export class RipplingJobPage {
    page;
    constructor(page) {
        this.page = page;
    }
    static supports(url) {
        return url.hostname.toLowerCase() === 'ats.rippling.com'
            && /\/(?:[a-z]{2}(?:-[A-Z]{2})\/)?[^/]+\/jobs\/[0-9a-f-]{36}(?:\/apply)?\/?$/i.test(url.pathname);
    }
    static applicationUrl(source) {
        const url = new URL(source);
        url.hash = '';
        return url;
    }
    async openApplication(jobUrl) {
        await this.page.goto(RipplingJobPage.applicationUrl(new URL(jobUrl)).toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (await this.page.locator(ripplingSelectors.form).isVisible().catch(() => false))
            return;
        const apply = this.page.getByRole('button', { name: /^apply now$/i }).first();
        await apply.waitFor({ state: 'visible', timeout: 30_000 });
        await this.pause(1_000, 1_700);
        await apply.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }));
        await this.pause(1_100, 1_700);
        await apply.hover();
        await this.pause(650, 1_050);
        await apply.click();
        await this.page.waitForURL(/\/apply(?:\?|$)/, { timeout: 30_000 }).catch(() => undefined);
    }
    async readDetails(originalUrl) {
        const details = await this.page.evaluate(() => {
            const applicationHeading = document.querySelector('form h4')?.textContent?.replace(/^Application:\s*/i, '').trim();
            const headings = [...document.querySelectorAll('h1, h2')].map((node) => node.textContent?.trim()).filter(Boolean);
            const title = applicationHeading || headings.find((value) => !/current (?:job )?openings/i.test(value));
            const form = document.querySelector('form');
            const body = form ? [...document.body.children].filter((node) => !node.contains(form)).map((node) => node.innerHTML).join('\n') : document.body.innerHTML;
            const location = [...document.querySelectorAll('main, body')][0]?.textContent?.match(/(?:Remote \([^)]+\)|[A-Z][A-Za-z .'-]+, [A-Z]{2})/)?.[0];
            return { title, description: body, location, pageTitle: document.title };
        });
        const url = new URL(this.page.url());
        const parts = url.pathname.split('/').filter(Boolean);
        const jobsIndex = parts.indexOf('jobs');
        return {
            postingId: jobsIndex >= 0 ? parts[jobsIndex + 1] || null : null,
            url: originalUrl,
            company: jobsIndex > 0 ? parts[jobsIndex - 1].replace(/[-_]+/g, ' ') : details.pageTitle.split('|').pop()?.trim(),
            jobTitle: details.title || undefined,
            jobDescription: details.description || undefined,
            jobBoard: 'rippling',
            location: details.location || undefined,
        };
    }
    random(minimum, maximum) { return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum; }
    async pause(minimum, maximum) { await this.page.waitForTimeout(this.random(minimum, maximum)); }
}
