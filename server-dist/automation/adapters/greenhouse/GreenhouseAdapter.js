import { GreenhouseApplicationPage } from './GreenhouseApplicationPage.js';
import { GreenhouseJobPage } from './GreenhouseJobPage.js';
export class GreenhouseAdapter {
    id = 'greenhouse';
    supports(url) { return GreenhouseJobPage.supports(url); }
    applicationUrl(url) { return GreenhouseJobPage.applicationUrl(url); }
    async openApplication(page, jobUrl) { return new GreenhouseJobPage(page).openApplication(jobUrl); }
    async waitForApplication(page) { return new GreenhouseApplicationPage(page).waitUntilReady(); }
    async extractJob(page, originalUrl) { return new GreenhouseJobPage(page).readDetails(originalUrl); }
    async extractQuestions(page) { return new GreenhouseApplicationPage(page).readQuestions(); }
    async focusQuestion(page, question) { return new GreenhouseApplicationPage(page).focus(question); }
    async extractQuestionOptions(page, question) { return new GreenhouseApplicationPage(page).extractOptions(question); }
    async fillAnswer(page, question, answer) { return new GreenhouseApplicationPage(page).fill(question, answer); }
    async fillEducation(page, education) { return new GreenhouseApplicationPage(page).fillEducation(education); }
    async uploadResume(page, resume) { return new GreenhouseApplicationPage(page).uploadResume(resume); }
    async uploadFile(page, question, file) { return new GreenhouseApplicationPage(page).uploadFile(question, file); }
    async detectBlocker(page) { return new GreenhouseApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new GreenhouseApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new GreenhouseApplicationPage(page).submit(); }
}
