import { bambooHrSelectors } from './selectors.js';
export class BambooHrJobPage {
    page;
    constructor(page) {
        this.page = page;
    }
    static supports(url) { return url.hostname.toLowerCase().endsWith('.bamboohr.com') && /^\/careers\/\d+\/?$/i.test(url.pathname); }
    static applicationUrl(source) { const url = new URL(source); url.hash = ''; return url; }
    async openApplication(jobUrl) {
        await this.page.goto(BambooHrJobPage.applicationUrl(new URL(jobUrl)).toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        const apply = this.page.getByRole('button', { name: /^apply for this job$/i });
        await apply.waitFor({ state: 'visible', timeout: 30_000 });
        await apply.click();
        await this.page.locator(bambooHrSelectors.form).waitFor({ state: 'visible', timeout: 30_000 });
    }
    async readDetails(originalUrl) {
        const details = await this.page.evaluate(() => {
            let posting = {};
            const script = [...document.querySelectorAll('script[type="application/ld+json"]')].find((node) => node.textContent?.includes('JobPosting'));
            try {
                posting = JSON.parse(script?.textContent || '{}');
            }
            catch { /* visible fallback below */ }
            const body = document.body.innerText;
            return { title: String(posting.title || document.querySelector('h3')?.textContent || document.title), description: String(posting.description || ''), employmentType: String(posting.employmentType || body.match(/Employment Type\s+([^\n]+)/i)?.[1] || ''), location: body.match(/Location\s+([^\n]+)/i)?.[1] || '' };
        });
        const url = new URL(this.page.url());
        const parts = url.pathname.split('/').filter(Boolean);
        return { postingId: parts[1] || null, url: originalUrl, company: url.hostname.split('.')[0]?.replace(/[-_]+/g, ' '), jobTitle: details.title || undefined, jobDescription: details.description || undefined, jobBoard: 'bamboohr', location: details.location || undefined, employmentType: details.employmentType || undefined };
    }
}
