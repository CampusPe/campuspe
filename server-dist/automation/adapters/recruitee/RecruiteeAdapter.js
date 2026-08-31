import { RecruiteeApplicationPage } from './RecruiteeApplicationPage.js';
import { RecruiteeJobPage } from './RecruiteeJobPage.js';
export class RecruiteeAdapter {
    id = 'recruitee';
    supports(url) { return RecruiteeJobPage.supports(url); }
    applicationUrl(url) { return RecruiteeJobPage.applicationUrl(url); }
    async openApplication(page, url) { return new RecruiteeJobPage(page).openApplication(url); }
    async waitForApplication(page) { return new RecruiteeApplicationPage(page).waitUntilReady(); }
    async extractJob(page, url) { return new RecruiteeJobPage(page).readDetails(url); }
    async extractQuestions(page) { return new RecruiteeApplicationPage(page).readQuestions(); }
    async focusQuestion(page, q) { return new RecruiteeApplicationPage(page).focus(q); }
    async fillAnswer(page, q, a) { return new RecruiteeApplicationPage(page).fill(q, a); }
    async fillEducation(page, e) { return new RecruiteeApplicationPage(page).fillEducation(e); }
    async uploadResume(page, r) { return new RecruiteeApplicationPage(page).uploadResume(r); }
    async waitForResumeParsing(page) { return new RecruiteeApplicationPage(page).waitForResumeParsing(); }
    async uploadFile(page, q, f) { return new RecruiteeApplicationPage(page).uploadFile(q, f); }
    async detectBlocker(page) { return new RecruiteeApplicationPage(page).detectBlocker(); }
    async isReviewReady(page) { return new RecruiteeApplicationPage(page).isReadyForReview(); }
    async submitApplication(page) { return new RecruiteeApplicationPage(page).submit(); }
}
