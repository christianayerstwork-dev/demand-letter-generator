// Content validation and sanitization for claim descriptions

// List of inappropriate words/phrases that should be flagged
const INAPPROPRIATE_KEYWORDS = [
  'criminal', 'illegal', 'scam', 'fraud', 'thief', 'steal', 'stolen',
  'liar', 'lying', 'cheat', 'cheating', 'stupid', 'idiot', 'moron',
  'hate', 'kill', 'die', 'threat', 'sue', 'lawyer', 'court',
  // Add common profanity
  'damn', 'hell', 'bastard', 'shit', 'fuck', 'ass', 'bitch', 'crap'
];

// Common informal/unprofessional phrases to detect
const INFORMAL_PATTERNS = [
  /you('re| are) a /i,
  /aint|ain't/i,
  /gonna|wanna|gotta/i,
  /u /i, // "u" instead of "you"
  /ur /i, // "ur" instead of "your"
  /!{2,}/, // Multiple exclamation marks
  /\?{2,}/, // Multiple question marks
];

export interface ValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  errors: string[];
  warnings: string[];
  suggestion?: string;
  requiresAdminReview: boolean;
}

/**
 * Validates claim description for inappropriate content
 */
export function validateClaimDescription(text: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    hasWarnings: false,
    errors: [],
    warnings: [],
    requiresAdminReview: false
  };

  if (!text || text.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Claim description is required');
    return result;
  }

  // Check length
  if (text.length > 200) {
    result.errors.push('Claim description must be under 200 characters');
    result.isValid = false;
  }

  if (text.length < 10) {
    result.warnings.push('Claim description seems too short. Please provide more detail.');
    result.hasWarnings = true;
  }

  const lowerText = text.toLowerCase();

  // Check for inappropriate keywords
  const foundInappropriate = INAPPROPRIATE_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );

  if (foundInappropriate.length > 0) {
    result.requiresAdminReview = true;
    result.warnings.push(
      'Your description contains language that may not be appropriate for a legal letter. ' +
      'Consider using more professional terminology.'
    );
    result.hasWarnings = true;
  }

  // Check for informal patterns
  const hasInformalLanguage = INFORMAL_PATTERNS.some(pattern => pattern.test(text));

  if (hasInformalLanguage) {
    result.hasWarnings = true;
    result.warnings.push(
      'Your description uses informal language. Consider rephrasing professionally.'
    );
    result.suggestion = generateProfessionalSuggestion(text);
  }

  // Check for personal attacks (sentences starting with "you are/you're")
  if (/you('re| are) (a |an )/i.test(text)) {
    result.requiresAdminReview = true;
    result.warnings.push(
      'Avoid personal statements. Focus on the facts of the unpaid debt.'
    );
    result.hasWarnings = true;
  }

  return result;
}

/**
 * Generates a professional alternative for informal text
 */
function generateProfessionalSuggestion(text: string): string {
  let suggestion = text;

  // Replace common informal phrases
  suggestion = suggestion.replace(/aint|ain't/gi, 'have not');
  suggestion = suggestion.replace(/\bu\b/gi, 'you');
  suggestion = suggestion.replace(/\bur\b/gi, 'your');
  suggestion = suggestion.replace(/gonna/gi, 'going to');
  suggestion = suggestion.replace(/wanna/gi, 'want to');
  suggestion = suggestion.replace(/gotta/gi, 'must');
  suggestion = suggestion.replace(/!{2,}/g, '');
  suggestion = suggestion.replace(/\?{2,}/g, '?');

  // Common debt-related phrases
  const debtPhrases: Record<string, string> = {
    'you didnt pay': 'Unpaid',
    'you havent paid': 'Outstanding',
    'you owe me': 'Outstanding amount for',
    'pay your rent': 'rent payment',
    'give me my money': 'outstanding payment'
  };

  Object.entries(debtPhrases).forEach(([informal, formal]) => {
    const regex = new RegExp(informal, 'gi');
    suggestion = suggestion.replace(regex, formal);
  });

  return suggestion;
}

/**
 * Sanitizes text to remove potentially dangerous content
 * @param trimWhitespace - Whether to trim leading/trailing whitespace (default: false for live input)
 */
export function sanitizeText(text: string, trimWhitespace: boolean = false): string {
  // Remove HTML tags
  let sanitized = text.replace(/<[^>]*>/g, '');

  // Remove script content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Normalize line breaks and excessive whitespace (but keep single spaces)
  sanitized = sanitized.replace(/\r\n/g, '\n'); // Normalize line breaks
  sanitized = sanitized.replace(/\n{2,}/g, '\n'); // Max one line break
  sanitized = sanitized.replace(/[ \t]{2,}/g, ' '); // Replace multiple spaces/tabs with single space

  // Only trim if explicitly requested (not during live typing)
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Remove multiple exclamation/question marks
  sanitized = sanitized.replace(/!{2,}/g, '!');
  sanitized = sanitized.replace(/\?{2,}/g, '?');

  return sanitized;
}

/**
 * Provides examples of well-formatted claim descriptions
 */
export const EXAMPLE_DESCRIPTIONS = [
  'Unpaid rent for November 2024',
  'Outstanding invoice #1234 for services rendered',
  'Overdue payment for goods delivered on 15/10/2024',
  'Unpaid deposit return following property inspection',
  'Outstanding balance from loan agreement dated 01/09/2024'
];
