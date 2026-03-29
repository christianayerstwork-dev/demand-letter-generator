import fs from 'fs';
import path from 'path';

// File-based session store for development (survives hot reloads)
// In production, use Redis or a database
// Use /tmp on Vercel (serverless environment)
const SESSION_FILE = process.env.VERCEL
  ? '/tmp/.sessions.json'
  : path.join(process.cwd(), '.sessions.json');

// Load existing sessions from file
function loadSessions(): Map<string, { username: string; createdAt: number }> {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      const obj = JSON.parse(data);
      return new Map(Object.entries(obj));
    }
  } catch (error) {
    console.error('Failed to load sessions:', error);
  }
  return new Map();
}

// Save sessions to file
function saveSessions() {
  try {
    const obj: Record<string, { username: string; createdAt: number }> = {};
    sessions.forEach((value, key) => {
      obj[key] = value;
    });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error('Failed to save sessions:', error);
  }
}

const sessions = loadSessions();

// Admin credentials from environment variables
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_this_password';

// Session configuration
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up expired sessions
 */
export function cleanupSessions() {
  const now = Date.now();
  const toDelete: string[] = [];
  sessions.forEach((session, sessionId) => {
    if (now - session.createdAt > SESSION_MAX_AGE) {
      toDelete.push(sessionId);
    }
  });
  toDelete.forEach(sessionId => sessions.delete(sessionId));
}

/**
 * Create a new admin session
 */
export function createSession(username: string, sessionToken: string) {
  sessions.set(sessionToken, {
    username,
    createdAt: Date.now()
  });
  cleanupSessions();
  saveSessions();
}

/**
 * Verify if a session token is valid
 */
export function verifyAdminSession(sessionToken: string): boolean {
  console.log('Verifying session. Total sessions in memory:', sessions.size);
  console.log('Session token (first 10 chars):', sessionToken.substring(0, 10));

  const session = sessions.get(sessionToken);
  if (!session) {
    console.log('Session not found in memory');
    return false;
  }

  // Check if session has expired
  const now = Date.now();
  const age = now - session.createdAt;
  console.log('Session age (minutes):', Math.floor(age / 60000));

  if (age > SESSION_MAX_AGE) {
    console.log('Session expired');
    sessions.delete(sessionToken);
    return false;
  }

  console.log('Session valid');
  return true;
}

/**
 * Delete a session
 */
export function deleteSession(sessionToken: string) {
  sessions.delete(sessionToken);
  saveSessions();
}

/**
 * Validate admin credentials
 */
export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}
