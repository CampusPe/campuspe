import { db } from './mongodb-helpers.js';
import { createSessionToken, hashToken } from './security.js';
const sessionDays = 30;
const cookieName = 'jobcopilot_session';
const readCookie = (request, name) => {
    const cookies = request.headers.cookie?.split(';') ?? [];
    for (const cookie of cookies) {
        const [key, ...value] = cookie.trim().split('=');
        if (key === name)
            return decodeURIComponent(value.join('='));
    }
    return null;
};
export const createSession = async (response, userId) => {
    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const now = new Date();
    const expires = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000);
    await db.sessions.insert({ token_hash: tokenHash, user_id: userId, expires_at: expires.toISOString(), created_at: now.toISOString() });
    response.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionDays * 24 * 60 * 60 * 1000 });
};
export const clearSession = async (request, response) => {
    const token = readCookie(request, cookieName);
    if (token)
        await db.sessions.delete({ token_hash: hashToken(token) });
    response.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
};
export const optionalAuth = async (request, _response, next) => {
    const token = readCookie(request, cookieName);
    if (!token)
        return next();
    const tokenHash = hashToken(token);
    const session = await db.sessions.find({ token_hash: tokenHash, expires_at: { $gt: new Date().toISOString() } });
    if (session) {
        const user = await db.users.find({ id: session.user_id });
        if (user) {
            request.user = { id: user.id, email: user.email, name: user.name };
            request.sessionTokenHash = tokenHash;
        }
    }
    next();
};
export const requireAuth = async (request, response, next) => {
    await optionalAuth(request, response, () => request.user ? next() : response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please log in.' } }));
};
