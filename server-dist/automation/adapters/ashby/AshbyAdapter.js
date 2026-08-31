import { AshbyApplicationPage } from './AshbyApplicationPage.js';
import { AshbyJobPage } from './AshbyJobPage.js';
export class AshbyAdapter {
    id = 'ashby';
    supports(url) { return AshbyJobPage.supports(url); }
    applicationUrl(url) { return AshbyJobPage.applicationUrl(url); }
    async openApplication(page, jobUrl) { return new AshbyJobPage(page).openApplication(jobUrl); }
    async waitForApplication(page) { return new AshbyApplicationPage(page).waitUntilReady(); }
    async extractJob(page, originalUrl) { return new AshbyJobPage(page).readDetails(originalUrl); }
    async extractQuestions(page) { return new AshbyApplicationPage(page).readQuestions(); }
    async focusQuestion(page, question) { return new AshbyApplicationPage(page).focus(question); }
    async fillAnswer(page, question, answer) { return new AshbyApplicationPage(page).fill(question, answer); }
    async fillEducation(page, education) { return new AshbyApplicationPage(page).fillEducation(education); }
    async uploadResume(page, resume) { return new AshbyApplicationPage(page).uploadResume(resume); }
    async uploadFile(page, question, file) { return new AshbyApplicationPage(page).uploadFile(question, file); }
    async detectBlocker(page) { return new AshbyApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new AshbyApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new AshbyApplicationPage(page).submit(); }
}
