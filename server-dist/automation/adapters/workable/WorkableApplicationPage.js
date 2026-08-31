import { Country } from 'country-state-city';
import { workableSelectors } from './selectors.js';
export class WorkableApplicationPage {
    page;
    constructor(page) {
        this.page = page;
    }
    async waitUntilReady() {
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.locator(workableSelectors.form).waitFor({ state: 'visible', timeout: 30_000 });
        await this.page.locator('[data-ui="firstname"]').waitFor({ state: 'visible', timeout: 30_000 });
    }
    async readQuestions() {
        return this.page.locator(workableSelectors.form).evaluate((form) => {
            const questions = [];
            const seen = new Set();
            const controls = [...form.querySelectorAll('input, textarea, select')];
            for (const control of controls) {
                const hidden = control.getAttribute('aria-hidden') === 'true' && control.type !== 'radio';
                if (hidden || control.type === 'hidden')
                    continue;
                const isResume = control.type === 'file' && control.getAttribute('data-ui') === 'resume';
                const key = control.name || control.id || control.getAttribute('data-ui') || '';
                const radioControls = control.type === 'radio' && control.name
                    ? [...form.querySelectorAll(`input[type="radio"][name="${CSS.escape(control.name)}"]`)]
                    : [];
                if (!key || seen.has(key))
                    continue;
                seen.add(key);
                const labelledBy = control.getAttribute('aria-labelledby')?.split(/\s+/)[0];
                let text = labelledBy ? document.getElementById(labelledBy)?.textContent?.replace(/\s+/g, ' ').trim() || '' : '';
                if (!text)
                    text = control.closest('label')?.textContent?.replace(/\s+/g, ' ').replace(/^\*/, '').trim() || key;
                if (isResume)
                    text = 'Resume/CV';
                if (control.name === 'phone')
                    text = 'Phone';
                const options = radioControls.length
                    ? radioControls.map((radio) => radio.closest('label')?.textContent?.replace(/\s+/g, ' ').trim() || radio.value)
                    : control instanceof HTMLSelectElement
                        ? [...control.options].map((option) => option.textContent?.trim() || option.value).filter((value) => value && !/^select/i.test(value))
                        : undefined;
                const inputType = isResume ? 'file' : radioControls.length ? 'radio' : control instanceof HTMLSelectElement ? 'select' : control instanceof HTMLTextAreaElement ? 'textarea' : control.type || 'text';
                const fieldType = inputType === 'textarea' ? 'textarea' : inputType === 'radio' || inputType === 'select' || inputType === 'checkbox' ? 'select' : inputType === 'number' ? 'number' : 'text';
                const answered = radioControls.length ? radioControls.some((radio) => radio.checked) : control.type === 'checkbox' ? control.checked : Boolean(control.value.trim());
                questions.push({ id: isResume ? '_systemfield_resume' : key, text, fieldType, options, required: control.required, locator: { kind: 'field', value: `name:${key}` }, answered, inputType });
            }
            const countryButton = form.querySelector('.iti__selected-flag[role="combobox"]');
            if (countryButton) {
                questions.splice(Math.max(0, questions.findIndex((question) => question.id === 'phone')), 0, { id: '_workable_phone_country', text: 'Phone country code', fieldType: 'select', required: true, locator: { kind: 'field', value: 'workable:phone-country' }, answered: false, inputType: 'country-code' });
            }
            return questions;
        });
    }
    async focus(question) {
        const input = this.inputFor(question);
        await input.scrollIntoViewIfNeeded();
        await this.pause(350, 650);
    }
    async fill(question, answer) {
        const desired = String(answer);
        if (question.locator.value === 'workable:phone-country') {
            const country = Country.getCountryByCode(desired.toUpperCase());
            const digits = (country?.phonecode || desired).replace(/\D/g, '');
            const isoCode = country?.isoCode.toLowerCase();
            if (!digits)
                throw new Error(`The saved phone country “${desired}” has no dial code.`);
            const button = this.page.locator(workableSelectors.phoneCountryButton);
            const current = (await button.getAttribute('title').catch(() => '')) || '';
            const selectedDialCode = (await button.locator('.iti__selected-dial-code').textContent().catch(() => '')) || '';
            if (!new RegExp(`\\+${digits}(?:\\D|$)`).test(`${current} ${selectedDialCode}`)) {
                await button.click();
                const option = this.page.locator(isoCode
                    ? `${workableSelectors.phoneCountryOptions}[data-country-code="${this.escapeAttribute(isoCode)}"]`
                    : `${workableSelectors.phoneCountryOptions}[data-dial-code="${digits}"]`).first();
                if (!await option.isVisible().catch(() => false))
                    throw new Error(`Workable does not list phone country code +${digits}.`);
                await option.click();
            }
        }
        else {
            const input = this.inputFor(question);
            if (question.inputType === 'radio') {
                const radios = this.page.locator(`input[type="radio"][name="${this.escapeAttribute(question.locator.value.slice(5))}"]`);
                const option = await this.matchRadio(radios, desired);
                if (!option)
                    throw new Error(`No matching Workable choice for “${desired}”.`);
                await option.click({ force: true });
            }
            else if (question.inputType === 'checkbox') {
                await input.setChecked(/^(?:yes|true|1|agree|accepted)$/i.test(desired));
            }
            else if (question.inputType === 'select') {
                await input.selectOption({ label: desired }).catch(() => input.selectOption(desired));
            }
            else {
                await input.click();
                await input.fill('');
                await input.pressSequentially(desired, { delay: this.random(45, 80), timeout: 90_000 });
                if (question.id === 'address') {
                    await this.pause(650, 950);
                    const suggestion = this.page.locator(workableSelectors.addressOptions).first();
                    if (await suggestion.isVisible().catch(() => false))
                        await suggestion.click();
                }
            }
        }
        await this.pause(400, 700);
    }
    async fillEducation(_education) { throw new Error('Workable education fields require per-form handling.'); }
    async uploadResume(resume) { await this.page.locator(workableSelectors.resume).setInputFiles(resume); }
    async waitForResumeParsing() {
        const input = this.page.locator(workableSelectors.resume);
        const busy = this.page.locator(`${workableSelectors.resumeDropzone} [role="progressbar"], ${workableSelectors.resumeDropzone} [aria-busy="true"]`);
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            const retainedFile = Boolean((await input.inputValue().catch(() => '')).trim());
            let processing = false;
            for (let index = 0; index < await busy.count(); index += 1) {
                if (await busy.nth(index).isVisible().catch(() => false)) {
                    processing = true;
                    break;
                }
            }
            if (retainedFile && !processing)
                return;
            await this.page.waitForTimeout(300);
        }
        throw new Error('Workable résumé processing did not finish. Check the uploaded file in the visible browser.');
    }
    async uploadFile(question, file) { await this.inputFor(question).setInputFiles(file); }
    async detectBlocker() {
        const captcha = this.page.locator(workableSelectors.captchaChallenge).first();
        if (await captcha.isVisible().catch(() => false))
            return { type: 'CAPTCHA', message: 'Complete the CAPTCHA in the visible browser, then continue.' };
        return null;
    }
    async isReadyForReview() { return this.page.locator(workableSelectors.submit).isVisible().catch(() => false); }
    async submit() {
        const button = this.page.locator(workableSelectors.submit);
        if (!await button.isVisible())
            throw new Error('The Workable Submit application button is not available.');
        await button.scrollIntoViewIfNeeded();
        await this.pause(500, 850);
        await button.click();
        const confirmation = this.page.getByText(/application (?:was |has been )?(?:submitted|received)|thank you for applying/i).first();
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
            const blocker = await this.detectBlocker();
            if (blocker)
                throw new Error(blocker.message);
            if (await confirmation.isVisible().catch(() => false))
                return;
            await this.page.waitForTimeout(350);
        }
        if (await button.isVisible().catch(() => false))
            throw new Error('Workable did not confirm submission. Review the highlighted fields in the browser.');
    }
    inputFor(question) {
        const value = question.locator.value;
        if (value === 'workable:phone-country')
            return this.page.locator(workableSelectors.phoneCountryButton);
        if (question.id === '_systemfield_resume')
            return this.page.locator(workableSelectors.resume);
        if (value.startsWith('name:'))
            return this.page.locator(`[name="${this.escapeAttribute(value.slice(5))}"]`).first();
        throw new Error(`Could not locate Workable field “${question.text}”.`);
    }
    async matchRadio(radios, answer) {
        const desired = this.normalize(answer);
        let partial = null;
        for (let index = 0; index < await radios.count(); index += 1) {
            const radio = radios.nth(index);
            const label = this.normalize(await radio.locator('xpath=ancestor::label[1]').textContent().catch(() => '') || '');
            const value = this.normalize(await radio.getAttribute('value') || '');
            if (label === desired || value === desired || (desired === 'yes' && value === 'true') || (desired === 'no' && value === 'false'))
                return radio;
            if (!partial && (label.includes(desired) || desired.includes(label)))
                partial = radio;
        }
        return partial;
    }
    normalize(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
    escapeAttribute(value) { return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"'); }
    random(minimum, maximum) { return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum; }
    async pause(minimum, maximum) { await this.page.waitForTimeout(this.random(minimum, maximum)); }
}
