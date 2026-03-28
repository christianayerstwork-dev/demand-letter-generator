import crypto from 'crypto';

/**
 * Generate a unique payment link token
 */
export function generatePaymentToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a tracked payment link URL
 */
export function generatePaymentLink(submissionId: string, token: string, baseUrl: string): string {
  return `${baseUrl}/pay/${submissionId}?token=${token}`;
}

/**
 * Generate bank transfer details as a formatted string
 */
export function formatBankDetails(bankDetails: {
  bankName?: string;
  sortCode?: string;
  accountNumber?: string;
  accountName?: string;
}, reference: string): string {
  if (!bankDetails.bankName || !bankDetails.sortCode || !bankDetails.accountNumber) {
    return '';
  }

  return `
Bank: ${bankDetails.bankName}
Sort Code: ${bankDetails.sortCode}
Account Number: ${bankDetails.accountNumber}
${bankDetails.accountName ? `Account Name: ${bankDetails.accountName}` : ''}
Reference: ${reference}
  `.trim();
}

/**
 * Create a payment instruction with link and bank details
 */
export function createPaymentInstructions(
  submissionId: string,
  token: string,
  baseUrl: string,
  amount: number,
  bankDetails?: {
    bankName?: string;
    sortCode?: string;
    accountNumber?: string;
    accountName?: string;
  }
): {
  paymentLink: string;
  bankTransferDetails: string | null;
  reference: string;
} {
  const reference = `DL-${submissionId.slice(-8).toUpperCase()}`;
  const paymentLink = generatePaymentLink(submissionId, token, baseUrl);

  const bankTransferDetails = bankDetails
    ? formatBankDetails(bankDetails, reference)
    : null;

  return {
    paymentLink,
    bankTransferDetails,
    reference,
  };
}
