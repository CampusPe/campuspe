import User from './models/User.js';
import Session from './models/Session.js';
import Profile from './models/Profile.js';
import AnswerMemory from './models/AnswerMemory.js';
import ResolutionLog from './models/ResolutionLog.js';
import AutomationRun from './models/AutomationRun.js';
import AutomationEvent from './models/AutomationEvent.js';
import SavedJob from './models/SavedJob.js';
import ResumeOptimization from './models/ResumeOptimization.js';
export const db = {
    // Users
    users: {
        insert: async (data) => {
            const user = new User(data);
            await user.save();
            return user;
        },
        find: async (query) => {
            // @ts-ignore
            return User.findOne(query).exec();
        },
        update: async (query, data) => {
            // @ts-ignore
            return User.updateOne(query, data).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return User.deleteOne(query).exec();
        },
    },
    // Sessions
    sessions: {
        insert: async (data) => {
            const session = new Session(data);
            await session.save();
            return session;
        },
        find: async (query) => {
            // @ts-ignore
            return Session.findOne(query).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return Session.deleteOne(query).exec();
        },
        deleteExpired: async () => {
            // @ts-ignore
            return Session.deleteMany({ expires_at: { $lt: new Date().toISOString() } }).exec();
        },
    },
    // Profiles
    profiles: {
        insert: async (data) => {
            const profile = new Profile(data);
            await profile.save();
            return profile;
        },
        find: async (query) => {
            // @ts-ignore
            return Profile.findOne(query).exec();
        },
        update: async (query, data) => {
            // @ts-ignore
            return Profile.updateOne(query, data).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return Profile.deleteOne(query).exec();
        },
    },
    // Answer Memory
    answerMemory: {
        insert: async (data) => {
            const memory = new AnswerMemory(data);
            await memory.save();
            return memory;
        },
        find: async (query) => {
            // @ts-ignore
            return AnswerMemory.find(query).exec();
        },
        update: async (query, data) => {
            // @ts-ignore
            return AnswerMemory.updateOne(query, data).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return AnswerMemory.deleteOne(query).exec();
        },
    },
    // Resolution Log
    resolutionLog: {
        insert: async (data) => {
            const log = new ResolutionLog(data);
            await log.save();
            return log;
        },
        find: async (query) => {
            // @ts-ignore
            return ResolutionLog.find(query).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return ResolutionLog.deleteOne(query).exec();
        },
    },
    // Automation Runs
    automationRuns: {
        insert: async (data) => {
            const run = new AutomationRun(data);
            await run.save();
            return run;
        },
        find: async (query) => {
            // @ts-ignore
            return AutomationRun.find(query).exec();
        },
        findOne: async (query) => {
            // @ts-ignore
            return AutomationRun.findOne(query).exec();
        },
        update: async (query, data) => {
            // @ts-ignore
            return AutomationRun.updateOne(query, data).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return AutomationRun.deleteOne(query).exec();
        },
    },
    // Automation Events
    automationEvents: {
        insert: async (data) => {
            const event = new AutomationEvent(data);
            await event.save();
            return event;
        },
        find: async (query) => {
            // @ts-ignore
            return AutomationEvent.find(query).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return AutomationEvent.deleteOne(query).exec();
        },
    },
    // Saved Jobs
    savedJobs: {
        insert: async (data) => {
            const job = new SavedJob(data);
            await job.save();
            return job;
        },
        find: async (query) => {
            // @ts-ignore
            return SavedJob.find(query).exec();
        },
        update: async (query, data) => {
            // @ts-ignore
            return SavedJob.updateOne(query, data).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return SavedJob.deleteOne(query).exec();
        },
    },
    // Resume Optimizations
    resumeOptimizations: {
        insert: async (data) => {
            const optimization = new ResumeOptimization(data);
            await optimization.save();
            return optimization;
        },
        find: async (query) => {
            // @ts-ignore
            return ResumeOptimization.find(query).exec();
        },
        findOne: async (query) => {
            // @ts-ignore
            return ResumeOptimization.findOne(query).exec();
        },
        update: async (query, data) => {
            // @ts-ignore
            return ResumeOptimization.updateOne(query, data).exec();
        },
        delete: async (query) => {
            // @ts-ignore
            return ResumeOptimization.deleteOne(query).exec();
        },
    },
};
// Cleanup expired sessions on startup
export const cleanupExpiredSessions = async () => {
    try {
        await db.sessions.deleteExpired();
    }
    catch (error) {
        console.error('Error cleaning up expired sessions:', error);
    }
};
