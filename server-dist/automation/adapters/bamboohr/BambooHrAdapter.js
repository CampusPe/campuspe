import { BambooHrApplicationPage } from './BambooHrApplicationPage.js';
import { BambooHrJobPage } from './BambooHrJobPage.js';
export class BambooHrAdapter {
    id = 'bamboohr';
    supports(url) { return BambooHrJobPage.supports(url); }
    applicationUrl(url) { return BambooHrJobPage.applicationUrl(url); }
    async openApplication(page, url) { return new BambooHrJobPage(page).openApplication(url); }
    async waitForApplication(page) { return new BambooHrApplicationPage(page).waitUntilReady(); }
    async extractJob(page, url) { return new BambooHrJobPage(page).readDetails(url); }
    async extractQuestions(page) { return new BambooHrApplicationPage(page).readQuestions(); }
    async focusQuestion(page, q) { return new BambooHrApplicationPage(page).focus(q); }
    async fillAnswer(page, q, a) { return new BambooHrApplicationPage(page).fill(q, a); }
    async fillEducation(page, e) { return new BambooHrApplicationPage(page).fillEducation(e); }
    async uploadResume(page, r) { return new BambooHrApplicationPage(page).uploadResume(r); }
    async waitForResumeParsing(page) { return new BambooHrApplicationPage(page).waitForResumeParsing(); }
    async uploadFile(page, q, f) { return new BambooHrApplicationPage(page).uploadFile(q, f); }
    async detectBlocker(page) { return new BambooHrApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new BambooHrApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new BambooHrApplicationPage(page).submit(); }
}
