import { randomUUID } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z, ZodError } from 'zod';
import { clearSession, createSession, optionalAuth, requireAuth } from './auth.js';
import { dataDir, port, rootDir, tailoredResumeDir, uploadDir } from './config.js';
import { db, cleanupExpiredSessions } from './mongodb-helpers.js';
import { decryptJson, encryptJson, hashPassword, verifyPassword } from './security.js';
import { answerResolver } from './resolver/engine.js';
import { automationManager } from './automation/manager.js';
import { supportedBoards } from './automation/registry.js';
import { City, Country, State } from 'country-state-city';
import { getRecommendedJobs } from './jobs.js';
import { extractResumeText, extractTargetJob, optimizeResume, reviewResume } from './resumeReview.js';
import { createTailoredResumeDocx, tailoredResumePreviewHtml } from './resumeDocument.js';
import connectDB from './mongodb.js';
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-8', legacyHeaders: false }));
// Connect to MongoDB
await connectDB();
await cleanupExpiredSessions();
const credentialsSchema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(128) });
const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(100) });
const addressFields = { city: z.string().max(150), state: z.string().max(150), country: z.string().max(150), postalCode: z.string().max(30) };
const experienceSchema = z.object({ id: z.number(), title: z.string().max(150), company: z.string().max(150), employmentType: z.string().max(50), location: z.string().max(150), ...addressFields, startDate: z.string().max(20), endDate: z.string().max(20), current: z.boolean(), description: z.string().max(4000) });
const educationSchema = z.object({ id: z.number(), school: z.string().max(200), degree: z.string().max(100), field: z.string().max(150), grade: z.string().max(100), ...addressFields, startDate: z.string().max(20), endDate: z.string().max(20), current: z.boolean(), description: z.string().max(3000) });
const demographicsSchema = z.object({ gender: z.string().max(100), orientation: z.string().max(100), ethnicity: z.string().max(200), disability: z.string().max(100), veteran: z.string().max(100) });
const profileSchema = z.object({
    name: z.string().trim().min(1).max(100), phone: z.string().max(50), phoneCountryCode: z.string().regex(/^$|^[A-Z]{2}$/), location: z.string().max(150), currentCity: z.string().max(150), currentState: z.string().max(150), currentCountry: z.string().max(150), linkedinUrl: z.string().max(500), githubUrl: z.string().max(500), portfolioUrl: z.string().max(500), experienceYears: z.string().max(50), noticePeriod: z.string().max(50), workAuthorized: z.string().max(50), sponsorship: z.string().max(50), currentSalary: z.string().max(100), expectedSalary: z.string().max(100), workArrangement: z.string().max(50), willingInOffice: z.string().max(50), willingRelocate: z.string().max(50), usWorkAuthorized: z.string().max(50), usSponsorship: z.string().max(50), usVisaType: z.string().max(50), activeImmigrationCase: z.string().max(100), referralSource: z.string().max(150), careerMotivation: z.string().max(2000), coverLetterIntro: z.string().max(3000), additionalInformation: z.string().max(3000), experiences: z.array(experienceSchema).max(30), education: z.array(educationSchema).max(20), demographics: demographicsSchema, allowDemographicSuggestions: z.boolean(),
});
const formQuestionSchema = z.object({ id: z.string().min(1).max(200), text: z.string().trim().min(1).max(2000), fieldType: z.enum(['text', 'textarea', 'number', 'boolean', 'select']), options: z.array(z.string().max(500)).max(100).optional(), required: z.boolean() });
const jobContextSchema = z.object({ company: z.string().max(200).optional(), jobTitle: z.string().max(200).optional(), jobDescription: z.string().max(30000).optional(), jobBoard: z.string().max(100).optional() });
const resolveSchema = z.object({ question: formQuestionSchema, job: jobContextSchema.optional() });
const rememberSchema = z.object({ question: formQuestionSchema, answer: z.union([z.string().max(10000), z.number(), z.boolean()]), scope: z.enum(['global', 'company']).default('global'), company: z.string().max(200).optional() }).superRefine((value, context) => { if (value.scope === 'company' && !value.company)
    context.addIssue({ code: 'custom', path: ['company'], message: 'Company is required for company-scoped answers.' }); });
const automationRunSchema = z.object({ jobUrl: z.string().trim().url().max(2000), autoSubmit: z.boolean().default(false), testMode: z.boolean().default(false) });
const locationCodeSchema = z.string().regex(/^[A-Z0-9-]{1,10}$/);
const recommendedJobSchema = z.object({
    id: z.string().min(1).max(2500), source: z.enum(['ashby', 'greenhouse', 'lever', 'workable']), company: z.string().min(1).max(200),
    title: z.string().min(1).max(300), location: z.string().max(300), workplaceType: z.string().max(50), employmentType: z.string().max(50),
    salary: z.string().max(500).nullable(), department: z.string().max(200).nullable(), skills: z.array(z.string().max(100)).max(20),
    publishedAt: z.string().datetime().nullable(), jobUrl: z.string().url().max(2500), applyUrl: z.string().url().max(2500),
});
const savedJobIdSchema = z.object({ jobId: z.string().min(1).max(2500) });
const jobsQuerySchema = z.object({
    offset: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(100).default(24),
    board: z.enum(['all', 'ashby', 'greenhouse', 'lever', 'workable']).default('all'), remote: z.enum(['true', 'false']).default('false'),
    q: z.string().trim().max(200).default(''),
});
const resumeReviewSchema = z.object({ jobUrl: z.string().trim().url().max(2500).optional() });
const resumeOptimizationSchema = z.object({ jobUrl: z.string().trim().url().max(2500), mode: z.enum(['review', 'automatic']).default('review') });
const resumeOptimizationIdSchema = z.object({ id: z.string().uuid() });
app.get('/api/health', (_request, response) => response.json({ data: { status: 'ok', database: dataDir } }));
app.post('/api/auth/signup', async (request, response, next) => {
    try {
        const input = signupSchema.parse(request.body);
        const existing = await db.users.find({ email: input.email.toLowerCase() });
        if (existing)
            return response.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' } });
        const userId = randomUUID();
        const password = hashPassword(input.password);
        const now = new Date().toISOString();
        await db.users.insert({ id: userId, email: input.email.toLowerCase(), name: input.name, password_hash: password.hash, password_salt: password.salt, created_at: now });
        await db.profiles.insert({ user_id: userId, updated_at: now });
        await createSession(response, userId);
        return response.status(201).json({ data: { user: { id: userId, name: input.name, email: input.email.toLowerCase() } } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/auth/login', async (request, response, next) => {
    try {
        const input = credentialsSchema.parse(request.body);
        const user = await db.users.find({ email: input.email.toLowerCase() });
        if (!user || !verifyPassword(input.password, user.password_salt, user.password_hash))
            return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
        await createSession(response, user.id);
        return response.json({ data: { user: { id: user.id, name: user.name, email: user.email } } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/auth/logout', requireAuth, async (request, response) => { await clearSession(request, response); response.status(204).end(); });
app.get('/api/auth/me', optionalAuth, async (request, response) => request.user ? response.json({ data: { user: request.user } }) : response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please log in.' } }));
const getProfile = async (userId) => {
    const profile = await db.profiles.find({ user_id: userId });
    if (!profile)
        return undefined;
    const user = await db.users.find({ id: userId });
    if (!user)
        return undefined;
    return { ...profile, name: user.name, email: user.email };
};
app.get('/api/profile', requireAuth, async (request, response) => {
    const row = await getProfile(request.user.id);
    if (!row)
        return response.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' } });
    response.json({ data: { profile: {
                name: row.name, email: row.email, phone: row.phone, phoneCountryCode: row.phone_country_code, location: row.location, currentCity: row.current_city, currentState: row.current_state, currentCountry: row.current_country, linkedinUrl: row.linkedin_url, githubUrl: row.github_url, portfolioUrl: row.portfolio_url, experienceYears: row.experience_years, noticePeriod: row.notice_period, workAuthorized: row.work_authorized, sponsorship: row.sponsorship, currentSalary: row.current_salary, expectedSalary: row.expected_salary, workArrangement: row.work_arrangement, willingInOffice: row.willing_in_office, willingRelocate: row.willing_relocate, usWorkAuthorized: row.us_work_authorized, usSponsorship: row.us_sponsorship, usVisaType: row.us_visa_type, activeImmigrationCase: row.active_immigration_case, referralSource: row.referral_source, careerMotivation: row.career_motivation, coverLetterIntro: row.cover_letter_intro, additionalInformation: row.additional_information,
                experiences: JSON.parse(String(row.experiences_json || '[]')), education: JSON.parse(String(row.education_json || '[]')), demographics: decryptJson(String(row.demographics_encrypted || ''), { gender: 'prefer', orientation: 'prefer', ethnicity: 'prefer', disability: 'prefer', veteran: 'prefer' }), allowDemographicSuggestions: Boolean(row.allow_demographic_suggestions), resume: row.resume_filename ? { filename: row.resume_filename, mime: row.resume_mime } : null, updatedAt: row.updated_at,
            } } });
});
app.get('/api/locations/countries', requireAuth, (_request, response) => response.json({ data: { options: Country.getAllCountries().map((country) => ({ code: country.isoCode, name: country.name, dialCode: country.phonecode ? `+${country.phonecode.replace(/^\+/, '')}` : '' })) } }));
app.get('/api/locations/states/:countryCode', requireAuth, (request, response, next) => {
    try {
        const countryCode = locationCodeSchema.parse(String(request.params.countryCode).toUpperCase());
        response.json({ data: { options: State.getStatesOfCountry(countryCode).map((state) => ({ code: state.isoCode, name: state.name })) } });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/locations/cities/:countryCode/:stateCode', requireAuth, (request, response, next) => {
    try {
        const countryCode = locationCodeSchema.parse(String(request.params.countryCode).toUpperCase());
        const stateCode = locationCodeSchema.parse(String(request.params.stateCode).toUpperCase());
        response.json({ data: { options: City.getCitiesOfState(countryCode, stateCode).map((city, index) => ({ code: `${city.name}-${index}`, name: city.name })) } });
    }
    catch (error) {
        next(error);
    }
});
app.put('/api/profile', requireAuth, async (request, response, next) => {
    try {
        const input = profileSchema.parse(request.body);
        const now = new Date().toISOString();
        await db.users.update({ id: request.user.id }, { name: input.name });
        await db.profiles.update({ user_id: request.user.id }, {
            phone: input.phone, phone_country_code: input.phoneCountryCode, location: [input.currentCity, input.currentState, input.currentCountry].filter(Boolean).join(', '), current_city: input.currentCity, current_state: input.currentState, current_country: input.currentCountry, linkedin_url: input.linkedinUrl, github_url: input.githubUrl, portfolio_url: input.portfolioUrl, experience_years: input.experienceYears, notice_period: input.noticePeriod, work_authorized: input.workAuthorized, sponsorship: input.sponsorship, current_salary: input.currentSalary, expected_salary: input.expectedSalary, work_arrangement: input.workArrangement, willing_in_office: input.willingInOffice, willing_relocate: input.willingRelocate, us_work_authorized: input.usWorkAuthorized, us_sponsorship: input.usSponsorship, us_visa_type: input.usVisaType, active_immigration_case: input.activeImmigrationCase, referral_source: input.referralSource, career_motivation: input.careerMotivation, cover_letter_intro: input.coverLetterIntro, additional_information: input.additionalInformation, experiences_json: JSON.stringify(input.experiences), education_json: JSON.stringify(input.education), demographics_encrypted: encryptJson(input.demographics), allow_demographic_suggestions: input.allowDemographicSuggestions ? 1 : 0, updated_at: now,
        });
        response.json({ data: { saved: true, updatedAt: now } });
    }
    catch (error) {
        next(error);
    }
});
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir, filename: (_request, file, callback) => callback(null, `${randomUUID()}${file.originalname.toLowerCase().endsWith('.pdf') ? '.pdf' : file.originalname.toLowerCase().endsWith('.docx') ? '.docx' : '.doc'}`) }), limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter: (_request, file, callback) => callback(null, ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) });
app.post('/api/profile/resume', requireAuth, upload.single('resume'), async (request, response) => {
    if (!request.file)
        return response.status(400).json({ error: { code: 'FILE_REQUIRED', message: 'Choose a PDF, DOC, or DOCX resume.' } });
    const current = await getProfile(request.user.id);
    if (current?.resume_storage_name) {
        const oldPath = resolve(uploadDir, String(current.resume_storage_name));
        if (oldPath.startsWith(uploadDir) && existsSync(oldPath))
            unlinkSync(oldPath);
    }
    await db.profiles.update({ user_id: request.user.id }, { resume_filename: request.file.originalname, resume_storage_name: request.file.filename, resume_mime: request.file.mimetype, updated_at: new Date().toISOString() });
    response.json({ data: { resume: { filename: request.file.originalname, mime: request.file.mimetype } } });
});
app.get('/api/profile/resume/file', requireAuth, async (request, response) => {
    const profile = await getProfile(request.user.id);
    if (!profile?.resume_storage_name)
        return response.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Upload a resume from your profile first.' } });
    const resumePath = resolve(uploadDir, String(profile.resume_storage_name));
    if (!resumePath.startsWith(`${uploadDir}/`) || !existsSync(resumePath))
        return response.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'The saved resume file could not be found.' } });
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', String(profile.resume_mime || 'application/octet-stream'));
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(String(profile.resume_filename || 'resume'))}`);
    response.sendFile(resumePath);
});
app.post('/api/profile/resume/review', requireAuth, async (request, response, next) => {
    try {
        const input = resumeReviewSchema.parse(request.body || {});
        const profile = await getProfile(request.user.id);
        if (!profile?.resume_storage_name)
            return response.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Upload a resume from your profile first.' } });
        const resumePath = resolve(uploadDir, String(profile.resume_storage_name));
        if (!resumePath.startsWith(`${uploadDir}/`) || !existsSync(resumePath))
            return response.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'The saved resume file could not be found.' } });
        const job = input.jobUrl ? await extractTargetJob(input.jobUrl) : undefined;
        const review = await reviewResume(await extractResumeText(resumePath), job);
        response.setHeader('Cache-Control', 'private, no-store');
        response.json({ data: { review, job: job ? { url: job.url, board: job.board, title: job.title, company: job.company, location: job.location, description: job.description.slice(0, 1_500) } : null } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/profile/resume/optimize', requireAuth, async (request, response, next) => {
    try {
        const input = resumeOptimizationSchema.parse(request.body);
        const profile = await getProfile(request.user.id);
        if (!profile?.resume_storage_name)
            return response.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Upload a resume from your profile first.' } });
        const resumePath = resolve(uploadDir, String(profile.resume_storage_name));
        if (!resumePath.startsWith(`${uploadDir}/`) || !existsSync(resumePath))
            return response.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'The saved resume file could not be found.' } });
        const resumeText = await extractResumeText(resumePath);
        const job = await extractTargetJob(input.jobUrl);
        const review = await reviewResume(resumeText, job);
        const proposal = await optimizeResume(resumeText, job, review.score);
        const id = randomUUID();
        const now = new Date().toISOString();
        const status = input.mode === 'automatic' ? 'APPROVED' : 'DRAFT';
        const storageName = status === 'APPROVED' ? `${id}.docx` : null;
        if (storageName)
            await createTailoredResumeDocx(proposal.tailoredResumeText, resolve(tailoredResumeDir, storageName));
        await db.resumeOptimizations.insert({ id, user_id: request.user.id, job_url: job.url, job_title: job.title, company: job.company, mode: input.mode, status, proposal_json: JSON.stringify(proposal), storage_name: storageName, created_at: now, approved_at: status === 'APPROVED' ? now : null });
        response.setHeader('Cache-Control', 'private, no-store');
        response.status(201).json({ data: { optimization: { id, mode: input.mode, status, job: { url: job.url, title: job.title, company: job.company, location: job.location }, proposal } } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/profile/resume/optimizations/:id/approve', requireAuth, async (request, response, next) => {
    try {
        const { id } = resumeOptimizationIdSchema.parse(request.params);
        const optimization = await db.resumeOptimizations.findOne({ id, user_id: request.user.id });
        if (!optimization)
            return response.status(404).json({ error: { code: 'OPTIMIZATION_NOT_FOUND', message: 'Tailored resume draft not found.' } });
        const proposal = JSON.parse(optimization.proposal_json);
        const storageName = `${id}.docx`;
        await createTailoredResumeDocx(proposal.tailoredResumeText, resolve(tailoredResumeDir, storageName));
        await db.resumeOptimizations.update({ id, user_id: request.user.id }, { status: 'APPROVED', storage_name: storageName, approved_at: new Date().toISOString() });
        response.json({ data: { approved: true } });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/profile/resume/optimizations/:id/download', requireAuth, async (request, response, next) => {
    try {
        const { id } = resumeOptimizationIdSchema.parse(request.params);
        const optimization = await db.resumeOptimizations.findOne({ id, user_id: request.user.id });
        if (!optimization)
            return response.status(404).json({ error: { code: 'OPTIMIZATION_NOT_FOUND', message: 'Tailored resume draft not found.' } });
        if (optimization.status !== 'APPROVED')
            return response.status(409).json({ error: { code: 'APPROVAL_REQUIRED', message: 'Approve this tailored resume before downloading it.' } });
        const filename = `tailored-resume-${optimization.company}-${optimization.job_title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
        if (!optimization.storage_name)
            return response.status(404).json({ error: { code: 'TAILORED_FILE_NOT_FOUND', message: 'The tailored Word file has not been generated.' } });
        const filePath = resolve(tailoredResumeDir, optimization.storage_name);
        if (!filePath.startsWith(`${tailoredResumeDir}/`) || !existsSync(filePath))
            return response.status(404).json({ error: { code: 'TAILORED_FILE_NOT_FOUND', message: 'The tailored Word file could not be found.' } });
        response.setHeader('Cache-Control', 'private, no-store');
        response.type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        response.download(filePath, `${filename}.docx`);
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/profile/resume/optimizations/:id/preview', requireAuth, async (request, response, next) => {
    try {
        const { id } = resumeOptimizationIdSchema.parse(request.params);
        const optimization = await db.resumeOptimizations.findOne({ id, user_id: request.user.id });
        if (!optimization)
            return response.status(404).type('text/plain').send('Tailored resume preview not found.');
        const proposal = JSON.parse(optimization.proposal_json);
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'");
        response.type('html').send(tailoredResumePreviewHtml(proposal.tailoredResumeText));
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/resolver/resolve', requireAuth, async (request, response, next) => {
    try {
        const input = resolveSchema.parse(request.body);
        const resolution = await answerResolver.resolve(request.user.id, input.question, input.job ?? {});
        response.json({ data: { resolution } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/resolver/memory', requireAuth, async (request, response, next) => {
    try {
        const input = rememberSchema.parse(request.body);
        const memory = await answerResolver.remember(request.user.id, input);
        response.status(201).json({ data: { memory } });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/resolver/memory', requireAuth, (request, response) => response.json({ data: { memories: answerResolver.listMemory(request.user.id) } }));
app.get('/api/resolver/logs', requireAuth, async (request, response) => {
    const logs = await db.resolutionLog.find({ user_id: request.user.id });
    response.json({ data: { logs } });
});
app.get('/api/automation/boards', requireAuth, (_request, response) => response.json({ data: { boards: supportedBoards() } }));
app.get('/api/jobs/recommended', requireAuth, async (request, response, next) => {
    try {
        const { jobs, sources } = await getRecommendedJobs();
        const query = jobsQuerySchema.parse(request.query);
        const search = query.q.toLowerCase();
        const filtered = jobs.filter((job) => {
            if (query.board !== 'all' && job.source !== query.board)
                return false;
            if (query.remote === 'true' && job.workplaceType !== 'Remote')
                return false;
            if (!search)
                return true;
            return [job.title, job.company, job.location, job.department, job.source, job.workplaceType, job.employmentType, ...job.skills]
                .filter(Boolean).join(' ').toLowerCase().includes(search);
        });
        const page = filtered.slice(query.offset, query.offset + query.limit);
        response.set('Cache-Control', 'no-store');
        response.json({ data: { jobs: page, sources, pagination: { offset: query.offset, limit: query.limit, total: filtered.length, hasMore: query.offset + page.length < filtered.length } } });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/jobs/saved', requireAuth, async (request, response) => {
    const rows = await db.savedJobs.find({ user_id: request.user.id });
    response.json({ data: { jobs: rows.map((row) => ({ ...JSON.parse(row.job_json), savedAt: row.saved_at })) } });
});
app.put('/api/jobs/saved', requireAuth, async (request, response, next) => {
    try {
        const job = recommendedJobSchema.parse(request.body);
        const savedAt = new Date().toISOString();
        const existing = await db.savedJobs.find({ user_id: request.user.id, job_id: job.id });
        if (existing && existing.length > 0) {
            await db.savedJobs.update({ user_id: request.user.id, job_id: job.id }, { job_json: JSON.stringify(job), saved_at: savedAt });
        }
        else {
            await db.savedJobs.insert({ user_id: request.user.id, job_id: job.id, job_json: JSON.stringify(job), saved_at: savedAt });
        }
        response.json({ data: { job, savedAt } });
    }
    catch (error) {
        next(error);
    }
});
app.delete('/api/jobs/saved', requireAuth, async (request, response, next) => {
    try {
        const { jobId } = savedJobIdSchema.parse(request.body);
        await db.savedJobs.delete({ user_id: request.user.id, job_id: jobId });
        response.status(204).end();
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/automation/runs', requireAuth, (request, response, next) => {
    try {
        const input = automationRunSchema.parse(request.body);
        response.status(202).json({ data: { run: automationManager.create(request.user.id, input.jobUrl, input.autoSubmit, input.testMode) } });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/automation/runs', requireAuth, (request, response) => response.json({ data: { runs: automationManager.list(request.user.id) } }));
app.get('/api/automation/runs/:id', requireAuth, (request, response) => {
    const run = automationManager.get(request.user.id, String(request.params.id));
    if (!run)
        return response.status(404).json({ error: { code: 'RUN_NOT_FOUND', message: 'Application run not found.' } });
    response.json({ data: { run } });
});
app.post('/api/automation/runs/:id/resume', requireAuth, async (request, response, next) => {
    try {
        const run = await automationManager.resume(request.user.id, String(request.params.id));
        response.status(202).json({ data: { run } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/automation/runs/:id/pause', requireAuth, (request, response, next) => {
    try {
        const run = automationManager.pauseRun(request.user.id, String(request.params.id));
        response.json({ data: { run } });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/automation/runs/:id/submit', requireAuth, async (request, response, next) => {
    try {
        const run = await automationManager.submit(request.user.id, String(request.params.id));
        response.json({ data: { run } });
    }
    catch (error) {
        next(error);
    }
});
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(resolve(rootDir, 'dist')));
    app.get('*', (_request, response) => response.sendFile(resolve(rootDir, 'dist', 'index.html')));
}
app.use((error, _request, response, _next) => {
    if (error instanceof ZodError)
        return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted information.', details: error.issues } });
    if (error instanceof multer.MulterError)
        return response.status(400).json({ error: { code: 'UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? 'Resume must be smaller than 10 MB.' : error.message } });
    console.error(error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong locally.' } });
});
app.listen(port, '127.0.0.1', () => console.log(`JobCopilot API ready at http://127.0.0.1:${port}`));
