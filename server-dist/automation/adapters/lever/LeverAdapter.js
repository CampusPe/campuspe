import { LeverApplicationPage } from './LeverApplicationPage.js';
import { LeverJobPage } from './LeverJobPage.js';
export class LeverAdapter {
    id = 'lever';
    supports(url) { return LeverJobPage.supports(url); }
    applicationUrl(url) { return LeverJobPage.applicationUrl(url); }
    async openApplication(page, jobUrl) { return new LeverJobPage(page).openApplication(jobUrl); }
    async waitForApplication(page) { return new LeverApplicationPage(page).waitUntilReady(); }
    async extractJob(page, originalUrl) { return new LeverJobPage(page).readDetails(originalUrl); }
    async extractQuestions(page) { return new LeverApplicationPage(page).readQuestions(); }
    async focusQuestion(page, question) { return new LeverApplicationPage(page).focus(question); }
    async fillAnswer(page, question, answer) { return new LeverApplicationPage(page).fill(question, answer); }
    async fillEducation(page, education) { return new LeverApplicationPage(page).fillEducation(education); }
    async uploadResume(page, resume) { return new LeverApplicationPage(page).uploadResume(resume); }
    async waitForResumeParsing(page) { return new LeverApplicationPage(page).waitForResumeParsing(); }
    async uploadFile(page, question, file) { return new LeverApplicationPage(page).uploadFile(question, file); }
    async detectBlocker(page) { return new LeverApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new LeverApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new LeverApplicationPage(page).submit(); }
}
