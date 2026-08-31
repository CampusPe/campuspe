import { RipplingApplicationPage } from './RipplingApplicationPage.js';
import { RipplingJobPage } from './RipplingJobPage.js';
export class RipplingAdapter {
    id = 'rippling';
    supports(url) { return RipplingJobPage.supports(url); }
    applicationUrl(url) { return RipplingJobPage.applicationUrl(url); }
    async openApplication(page, jobUrl) { return new RipplingJobPage(page).openApplication(jobUrl); }
    async waitForApplication(page) { return new RipplingApplicationPage(page).waitUntilReady(); }
    async extractJob(page, originalUrl) { return new RipplingJobPage(page).readDetails(originalUrl); }
    async extractQuestions(page) { return new RipplingApplicationPage(page).readQuestions(); }
    async focusQuestion(page, question) { return new RipplingApplicationPage(page).focus(question); }
    async extractQuestionOptions(page, question) { return new RipplingApplicationPage(page).readOptions(question); }
    async fillAnswer(page, question, answer) { return new RipplingApplicationPage(page).fill(question, answer); }
    async fillEducation(page, education) { return new RipplingApplicationPage(page).fillEducation(education); }
    async uploadResume(page, resume) { return new RipplingApplicationPage(page).uploadResume(resume); }
    async uploadFile(page, question, file) { return new RipplingApplicationPage(page).uploadFile(question, file); }
    async detectBlocker(page) { return new RipplingApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new RipplingApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new RipplingApplicationPage(page).submit(); }
}
