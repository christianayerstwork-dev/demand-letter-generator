export type ToneType = 'friendly' | 'professional' | 'assertive' | 'aggressive';
export type RelationshipType = 'landlord' | 'company' | 'individual' | 'guarantor' | 'other';
export type DeliveryMethod = 'email' | 'self';

export interface ClientData {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  relationshipToDebtor: RelationshipType;
  relationshipOther?: string; // For custom relationship description
  bankName?: string; // Optional bank details for payment
  accountNumber?: string;
  sortCode?: string;
}

export interface Attachment {
  fileName: string;
  fileData: string; // base64 encoded
  fileType: string; // MIME type
  fileSize: number; // in bytes
}

export interface LetterData {
  // Client details
  client: ClientData;

  // Debtor details
  debtorName: string;
  debtorAddress: string;
  debtorEmail: string;
  amountOwed: string;
  includeInterest?: boolean;
  interestRate?: string;
  paymentDate: string;
  claimDescription: string;
  tone: ToneType;

  // Delivery method
  deliveryMethod: DeliveryMethod;

  // Supporting documents
  attachments?: Attachment[];

  // Branding
  logo?: string; // base64 encoded image
  signature?: string; // base64 encoded image
}

export interface LetterContent {
  greeting: string;
  opening: string;
  body: string;
  closing: string;
  signature: string;
}
