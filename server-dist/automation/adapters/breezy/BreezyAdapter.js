import { BreezyApplicationPage } from './BreezyApplicationPage.js';
import { BreezyJobPage } from './BreezyJobPage.js';
export class BreezyAdapter {
    id = 'breezy';
    supports(url) { return BreezyJobPage.supports(url); }
    applicationUrl(url) { return BreezyJobPage.applicationUrl(url); }
    async openApplication(page, jobUrl) { return new BreezyJobPage(page).openApplication(jobUrl); }
    async waitForApplication(page) { return new BreezyApplicationPage(page).waitUntilReady(); }
    async extractJob(page, originalUrl) { return new BreezyJobPage(page).readDetails(originalUrl); }
    async extractQuestions(page) { return new BreezyApplicationPage(page).readQuestions(); }
    async focusQuestion(page, question) { return new BreezyApplicationPage(page).focus(question); }
    async fillAnswer(page, question, answer) { return new BreezyApplicationPage(page).fill(question, answer); }
    async fillEducation(page, education) { return new BreezyApplicationPage(page).fillEducation(education); }
    async uploadResume(page, resume) { return new BreezyApplicationPage(page).uploadResume(resume); }
    async uploadFile(page, question, file) { return new BreezyApplicationPage(page).uploadFile(question, file); }
    async detectBlocker(page) { return new BreezyApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new BreezyApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new BreezyApplicationPage(page).submit(); }
}
