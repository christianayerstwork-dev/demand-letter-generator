import { LetterData } from '@/types';
import fs from 'fs';
import path from 'path';

export interface Submission {
  id: string;
  letterData: LetterData;
  stripeSessionId: string;
  status: 'pending' | 'approved' | 'rejected';
  flaggedReasons: string[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;

  // Payment tracking
  paymentStatus?: 'unpaid' | 'paid' | 'partial' | 'dispute';
  paymentReceivedDate?: string;
  paymentAmount?: number;
  paymentNotes?: string;

  // Email tracking (Resend webhook integration)
  emailDelivered?: boolean;
  emailDeliveredAt?: string;
  emailOpened?: boolean;
  emailOpenedAt?: string;
  emailOpenCount?: number;
  emailClicked?: boolean;
  emailClickedAt?: string;

  // Payment link tracking
  paymentLinkToken?: string; // Unique token for payment link
  paymentLinkClicked?: boolean;
  paymentLinkClickedAt?: string;
  paymentLinkClickCount?: number;

  // Client/Debtor response tracking
  debtorResponded?: boolean;
  debtorResponseDate?: string;
  debtorResponseNotes?: string;

  // Case closure
  caseClosed?: boolean;
  caseClosedDate?: string;
  caseClosureReason?: 'paid_full' | 'paid_partial' | 'no_response' | 'dispute' | 'withdrawn';
  caseNotes?: string;
}

// Use /tmp directory on Vercel (serverless), local data directory otherwise
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Get all submissions
 */
export function getAllSubmissions(): Submission[] {
  ensureDataDir();
  try {
    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading submissions:', error);
    return [];
  }
}

/**
 * Get pending submissions that need review
 */
export function getPendingSubmissions(): Submission[] {
  return getAllSubmissions().filter(s => s.status === 'pending');
}

/**
 * Get a single submission by ID
 */
export function getSubmission(id: string): Submission | null {
  const submissions = getAllSubmissions();
  return submissions.find(s => s.id === id) || null;
}

/**
 * Add a new submission for review
 */
export function addSubmission(submission: Omit<Submission, 'id' | 'submittedAt' | 'status'>): Submission {
  ensureDataDir();
  const submissions = getAllSubmissions();

  const newSubmission: Submission = {
    ...submission,
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  submissions.push(newSubmission);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

  return newSubmission;
}

/**
 * Approve a submission
 */
export function approveSubmission(id: string, reviewedBy: string = 'admin'): Submission | null {
  ensureDataDir();
  const submissions = getAllSubmissions();
  const index = submissions.findIndex(s => s.id === id);

  if (index === -1) return null;

  submissions[index].status = 'approved';
  submissions[index].reviewedAt = new Date().toISOString();
  submissions[index].reviewedBy = reviewedBy;

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

  return submissions[index];
}

/**
 * Reject a submission
 */
export function rejectSubmission(id: string, reviewedBy: string = 'admin'): Submission | null {
  ensureDataDir();
  const submissions = getAllSubmissions();
  const index = submissions.findIndex(s => s.id === id);

  if (index === -1) return null;

  submissions[index].status = 'rejected';
  submissions[index].reviewedAt = new Date().toISOString();
  submissions[index].reviewedBy = reviewedBy;

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

  return submissions[index];
}

/**
 * Update a submission's letter data
 */
export function updateSubmission(id: string, letterData: LetterData): Submission | null {
  ensureDataDir();
  const submissions = getAllSubmissions();
  const index = submissions.findIndex(s => s.id === id);

  if (index === -1) return null;

  submissions[index].letterData = letterData;
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

  return submissions[index];
}

/**
 * Update tracking information for a submission
 */
export function updateTracking(
  id: string,
  updates: Partial<Omit<Submission, 'id' | 'letterData' | 'stripeSessionId' | 'status' | 'flaggedReasons' | 'submittedAt'>>
): Submission | null {
  ensureDataDir();
  const submissions = getAllSubmissions();
  const index = submissions.findIndex(s => s.id === id);

  if (index === -1) return null;

  // Merge updates into existing submission
  submissions[index] = {
    ...submissions[index],
    ...updates
  };

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));

  return submissions[index];
}

/**
 * Delete a submission
 */
export function deleteSubmission(id: string): boolean {
  ensureDataDir();
  const submissions = getAllSubmissions();
  const filtered = submissions.filter(s => s.id !== id);

  if (filtered.length === submissions.length) return false;

  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}
