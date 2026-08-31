import { db } from './database.js';
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
export const createSession = (response, userId) => {
    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const now = new Date();
    const expires = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000);
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(tokenHash, userId, expires.toISOString(), now.toISOString());
    response.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionDays * 24 * 60 * 60 * 1000 });
};
export const clearSession = (request, response) => {
    const token = readCookie(request, cookieName);
    if (token)
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    response.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
};
export const optionalAuth = (request, _response, next) => {
    const token = readCookie(request, cookieName);
    if (!token)
        return next();
    const tokenHash = hashToken(token);
    const user = db.prepare(`SELECT users.id, users.email, users.name FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(tokenHash, new Date().toISOString());
    if (user) {
        request.user = user;
        request.sessionTokenHash = tokenHash;
    }
    next();
};
export const requireAuth = (request, response, next) => {
    optionalAuth(request, response, () => request.user ? next() : response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please log in.' } }));
};
