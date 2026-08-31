import { WorkableApplicationPage } from './WorkableApplicationPage.js';
import { WorkableJobPage } from './WorkableJobPage.js';
export class WorkableAdapter {
    id = 'workable';
    supports(url) { return WorkableJobPage.supports(url); }
    applicationUrl(url) { return WorkableJobPage.applicationUrl(url); }
    async openApplication(page, jobUrl) { return new WorkableJobPage(page).openApplication(jobUrl); }
    async waitForApplication(page) { return new WorkableApplicationPage(page).waitUntilReady(); }
    async extractJob(page, originalUrl) { return new WorkableJobPage(page).readDetails(originalUrl); }
    async extractQuestions(page) { return new WorkableApplicationPage(page).readQuestions(); }
    async focusQuestion(page, question) { return new WorkableApplicationPage(page).focus(question); }
    async fillAnswer(page, question, answer) { return new WorkableApplicationPage(page).fill(question, answer); }
    async fillEducation(page, education) { return new WorkableApplicationPage(page).fillEducation(education); }
    async uploadResume(page, resume) { return new WorkableApplicationPage(page).uploadResume(resume); }
    async waitForResumeParsing(page) { return new WorkableApplicationPage(page).waitForResumeParsing(); }
    async uploadFile(page, question, file) { return new WorkableApplicationPage(page).uploadFile(question, file); }
    async detectBlocker(page) { return new WorkableApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new WorkableApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new WorkableApplicationPage(page).submit(); }
}
