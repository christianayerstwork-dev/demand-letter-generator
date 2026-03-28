import { LetterData, LetterContent, ToneType, RelationshipType } from '@/types';
import { format } from 'date-fns';

// Helper function to get relationship text
function getRelationshipText(relationship: RelationshipType, customText?: string): string {
  switch (relationship) {
    case 'landlord':
      return 'landlord';
    case 'company':
      return 'client company';
    case 'individual':
      return 'client';
    case 'guarantor':
      return 'party calling on your guarantee';
    case 'other':
      return customText || 'our client';
    default:
      return 'our client';
  }
}

// Helper function to get context text based on relationship
function getContextText(relationship: RelationshipType): string {
  switch (relationship) {
    case 'landlord':
      return 'regarding your tenancy at';
    case 'company':
      return 'relating to your account with';
    case 'individual':
      return 'relating to';
    case 'guarantor':
      return 'relating to the guarantee you provided for';
    case 'other':
      return 'relating to';
    default:
      return 'relating to';
  }
}

// Base template variations by tone
const toneVariations = {
  friendly: {
    greeting: 'Dear',
    opening: (relationship: string) => `Your details have been passed to us by your ${relationship}.\n\nThis is a friendly reminder that you owe`,
    payment: 'Please make payment within',
    consequence: 'If payment is made no further action will be taken. If no payment is made then the matter may be escalated to specialists for further action against you.',
    communication: (relationship: string) => `Any communications in relation to the letter must be addressed to your ${relationship} directly - who has also received a copy of this letter.`,
    closing: 'Yours sincerely,'
  },
  professional: {
    greeting: 'Dear',
    opening: (relationship: string) => `Your details have been forwarded to us by your ${relationship}.\n\nWe write to formally notify you of an outstanding debt of`,
    payment: 'We require payment in full within',
    consequence: 'Upon receipt of payment, this matter will be considered resolved. Failure to remit payment may result in the matter being referred to debt recovery specialists for further legal action.',
    communication: (relationship: string) => `All correspondence regarding this matter should be directed to your ${relationship}, who has been copied on this notice.`,
    closing: 'Yours faithfully,'
  },
  assertive: {
    greeting: 'Dear',
    opening: (relationship: string) => `Your details have been provided to us by your ${relationship}.\n\nYou are hereby notified that you have an outstanding debt of`,
    payment: 'Payment in full is required within',
    consequence: 'Failure to make payment will result in immediate escalation to debt recovery specialists and may lead to legal proceedings being commenced against you without further notice.',
    communication: (relationship: string) => `All communications must be directed to your ${relationship}. This letter serves as formal notice.`,
    closing: 'Yours faithfully,'
  },
  aggressive: {
    greeting: 'Dear',
    opening: (relationship: string) => `Your ${relationship} has instructed us to pursue recovery of outstanding monies owed by you.\n\nYou currently owe`,
    payment: 'You are required to make full payment within',
    consequence: 'Be advised that failure to pay will result in immediate legal action. This may include county court proceedings, additional costs, and damage to your credit rating. We will not hesitate to pursue all available legal remedies.',
    communication: (relationship: string) => `Direct all communications to your ${relationship} immediately. This is your final notice before legal proceedings commence.`,
    closing: 'Yours faithfully,'
  }
};

export function generateLetter(data: LetterData): LetterContent {
  const tone = toneVariations[data.tone];
  const today = format(new Date(), 'do MMMM yyyy');

  // Get relationship text
  const relationshipText = getRelationshipText(
    data.client.relationshipToDebtor,
    data.client.relationshipOther
  );

  // Get context text based on relationship
  const contextText = getContextText(data.client.relationshipToDebtor);

  // Calculate days until payment
  const paymentDate = new Date(data.paymentDate);
  const todayDate = new Date();
  const diffTime = Math.abs(paymentDate.getTime() - todayDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedPaymentDate = format(paymentDate, 'do MMMM yyyy');

  // Build bank details section if provided
  let bankDetailsSection = '';
  if (data.client.bankName || data.client.accountNumber || data.client.sortCode) {
    bankDetailsSection = '\n\nPayment should be made to the following account:';
    if (data.client.bankName) {
      bankDetailsSection += `\nBank Name: ${data.client.bankName}`;
    }
    if (data.client.sortCode) {
      bankDetailsSection += `\nSort Code: ${data.client.sortCode}`;
    }
    if (data.client.accountNumber) {
      bankDetailsSection += `\nAccount Number: ${data.client.accountNumber}`;
    }
  }

  // Build interest clause if applicable
  let interestClause = '';
  if (data.includeInterest && data.interestRate) {
    interestClause = ` plus interest at ${data.interestRate}% per annum from the date payment was due`;
  } else if (data.includeInterest) {
    interestClause = ' plus interest';
  }

  return {
    greeting: `${tone.greeting} ${data.debtorName},`,
    opening: `Re: ${data.claimDescription}\n\n${tone.opening(relationshipText)} £${data.amountOwed}${interestClause} for ${data.claimDescription} ${contextText} ${data.debtorAddress}.`,
    body: `${tone.payment} ${diffDays} days of this letter (by ${formattedPaymentDate}).${bankDetailsSection}\n\n${tone.consequence}\n\n${tone.communication(relationshipText)}`,
    closing: tone.closing,
    signature: 'SMART SETTLE GO'
  };
}

export function formatLetterForDisplay(content: LetterContent, date: string): string {
  return `${date}\n\n${content.greeting}\n\n${content.opening}\n\n${content.body}\n\n${content.closing}\n\n${content.signature}`;
}
