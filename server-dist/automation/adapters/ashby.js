const applicationFormSelector = '.ashby-application-form-question-title';
export class AshbyAdapter {
    id = 'ashby';
    supports(url) { return url.hostname.toLowerCase() === 'jobs.ashbyhq.com' && url.pathname.split('/').filter(Boolean).length >= 2; }
    applicationUrl(url) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.at(-1) !== 'application')
            parts.push('application');
        url.pathname = `/${parts.join('/')}`;
        url.search = '';
        url.hash = '';
        return url;
    }
    async waitForApplication(page) {
        await page.waitForLoadState('domcontentloaded');
        await page.locator(applicationFormSelector).first().waitFor({ state: 'visible', timeout: 30_000 });
    }
    async extractJob(page, originalUrl) {
        const embedded = await page.evaluate(() => window.__appData ?? null);
        const posting = embedded?.posting;
        const heading = await page.locator('.ashby-job-posting-heading, h1').first().textContent();
        return { postingId: posting?.id ?? this.postingIdFromUrl(page.url()), url: originalUrl, company: embedded?.organization?.name?.trim(), jobTitle: posting?.title?.trim() || heading?.trim(), jobDescription: posting?.descriptionHtml, jobBoard: this.id, location: [posting?.locationName, ...(posting?.secondaryLocationNames ?? [])].filter(Boolean).join('; ') || undefined, employmentType: posting?.employmentType, workplaceType: posting?.workplaceType, compensation: posting?.compensationTierSummary };
    }
    async extractQuestions(page) {
        return page.locator('.ashby-application-form-field-entry, fieldset').evaluateAll((containers) => {
            const questions = [];
            const seen = new Set();
            for (const [index, container] of containers.entries()) {
                const directLabels = [...container.children].filter((child) => child.matches('label.ashby-application-form-question-title'));
                const label = directLabels[0] ?? container.querySelector('label.ashby-application-form-question-title');
                if (!label)
                    continue;
                const text = label.textContent?.replace(/\s+/g, ' ').trim();
                if (!text)
                    continue;
                const fieldPath = container.dataset.fieldPath || label.htmlFor || `ashby-field-${index}`;
                if (seen.has(fieldPath))
                    continue;
                seen.add(fieldPath);
                const input = container.querySelector('input:not([type="hidden"]), textarea, select');
                const yesNo = container.querySelector('.ashby-application-form-input-yesno');
                const radios = [...container.querySelectorAll('input[type="radio"]')];
                const options = yesNo ? [...yesNo.querySelectorAll('button[data-option]')].map((button) => button.textContent?.trim() || '') : radios.length ? radios.map((radio) => radio.getAttribute('aria-label') || radio.value).filter(Boolean) : input instanceof HTMLSelectElement ? [...input.options].filter((option) => !option.disabled && option.value).map((option) => option.textContent?.trim() || option.value) : undefined;
                const inputType = input?.getAttribute('type') || input?.tagName.toLowerCase() || (yesNo ? 'boolean' : '');
                let fieldType = input instanceof HTMLTextAreaElement ? 'textarea' : yesNo || inputType === 'checkbox' || inputType === 'radio' ? 'boolean' : input instanceof HTMLSelectElement || input?.getAttribute('role') === 'combobox' ? 'select' : inputType === 'number' ? 'number' : 'text';
                if (inputType === 'file')
                    fieldType = 'text';
                const answered = yesNo ? Boolean(yesNo.querySelector('button[aria-pressed="true"]')) : radios.length ? radios.some((radio) => radio.checked) : input instanceof HTMLInputElement && input.type === 'file' ? Boolean(input.files?.length) : Boolean(input && 'value' in input && input.value.trim());
                const required = label.className.includes('required') || Boolean(input?.hasAttribute('required'));
                questions.push({ id: fieldPath, text, fieldType, options, required, locator: { kind: 'field', value: fieldPath }, answered, inputType });
            }
            const education = document.querySelector('#_systemfield_education_history-degree')?.closest('fieldset, .ashby-application-form-section-container');
            if (education && !questions.some((question) => question.id === '_systemfield_education_history')) {
                const school = education.querySelector('input[placeholder="Search schools..."]');
                questions.push({ id: '_systemfield_education_history', text: 'Education History', fieldType: 'text', required: true, locator: { kind: 'education', value: '_systemfield_education_history' }, answered: Boolean(school?.value.trim()) });
            }
            return questions;
        });
    }
    async fillAnswer(page, question, answer) {
        const safeId = question.id.replace(/[^a-zA-Z0-9_-]/g, '');
        const safeAttribute = question.id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const container = question.id.startsWith('_systemfield_')
            ? page.locator(`[data-field-path="${safeAttribute}"], #${safeId}`).first()
            : page.locator(`[data-field-path="${safeAttribute}"]`).first();
        if (question.locator.kind === 'education')
            throw new Error('Education requires structured handling.');
        const yesNo = container.locator('.ashby-application-form-input-yesno');
        if (await yesNo.count()) {
            const desired = String(answer).toLowerCase().startsWith('y') ? 'yes' : 'no';
            await yesNo.locator(`button[data-option="${desired}"]`).click();
            return;
        }
        const input = container.locator('input:not([type="hidden"]), textarea, select').first();
        const tag = await input.evaluate((element) => element.tagName.toLowerCase());
        if (tag === 'select')
            await input.selectOption({ label: String(answer) }).catch(() => input.selectOption(String(answer)));
        else
            await input.fill(String(answer));
    }
    async detectBlocker(page) {
        const challenge = page.locator('iframe[src*="recaptcha/api2/bframe"]');
        if (await challenge.count() && await challenge.first().isVisible())
            return { type: 'CAPTCHA', message: 'Complete the CAPTCHA in the visible browser, then continue.' };
        const login = page.getByText(/sign in|log in/i).first();
        if (await login.count() && !await page.locator(applicationFormSelector).count())
            return { type: 'LOGIN', message: 'Sign in in the visible browser, then continue.' };
        return null;
    }
    async isReviewReady(page) { return page.getByRole('button', { name: /submit application/i }).isVisible().catch(() => false); }
    postingIdFromUrl(value) { const parts = new URL(value).pathname.split('/').filter(Boolean); const index = parts.indexOf('application'); return index > 0 ? parts[index - 1] : parts.at(-1) ?? null; }
}
