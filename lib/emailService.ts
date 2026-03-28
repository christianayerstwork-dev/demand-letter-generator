import { Resend } from 'resend';
import { LetterData } from '@/types';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { LetterPDF } from './pdfGenerator';
import { CertificateOfService } from './certificateGenerator';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  cc?: string;
  subject: string;
  letterData: LetterData;
  paymentLink?: string;
  submissionId?: string;
}

/**
 * Sends a demand letter email with PDF attachment
 */
export async function sendDemandLetter(options: EmailOptions) {
  try {
    // Generate PDF buffer
    // @ts-expect-error - @react-pdf types don't match but work correctly at runtime
    const stream = await renderToStream(React.createElement(LetterPDF, { data: options.letterData }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Create filename
    const filename = `demand-letter-${options.letterData.debtorName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;

    // Prepare attachments array with the PDF and user attachments
    const attachments: any[] = [
      {
        filename: filename,
        content: pdfBuffer,
      },
    ];

    // Add user's supporting documents
    if (options.letterData.attachments && options.letterData.attachments.length > 0) {
      options.letterData.attachments.forEach(attachment => {
        attachments.push({
          filename: attachment.fileName,
          content: Buffer.from(attachment.fileData, 'base64'),
        });
      });
    }

    // Send email with PDF attachment
    console.log(`📧 Attempting to send email TO: ${options.to}, CC: ${options.cc || 'none'}`);
    const { data, error } = await resend.emails.send({
      from: 'Smart Settle Go <onboarding@resend.dev>',
      to: options.to,
      cc: options.cc,
      subject: options.subject,
      html: generateEmailHTML(options.letterData, options.paymentLink, options.submissionId),
      attachments: attachments,
      tags: [
        {
          name: 'submission_id',
          value: options.submissionId || 'unknown'
        },
        {
          name: 'letter_type',
          value: 'demand_letter'
        }
      ],
    });

    if (error) {
      console.error('Email sending error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Email sent successfully:', data);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

/**
 * Generates HTML email content with payment link and visual nudges
 */
function generateEmailHTML(letterData: LetterData, paymentLink?: string, submissionId?: string): string {
  const daysUntilPayment = Math.ceil((new Date(letterData.paymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgencyColor = daysUntilPayment <= 7 ? '#dc2626' : daysUntilPayment <= 14 ? '#f59e0b' : '#2563eb';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demand Letter from Smart Settle Go</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">SMART SETTLE GO</h1>
    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Professional Debt Recovery Services</p>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #2563eb; margin-top: 0;">Formal Demand for Payment</h2>

    <!-- Urgency Countdown -->
    <div style="background: linear-gradient(135deg, ${urgencyColor}15 0%, ${urgencyColor}05 100%); border: 2px solid ${urgencyColor}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 48px; font-weight: bold; color: ${urgencyColor}; margin: 0;">${daysUntilPayment}</div>
      <div style="font-size: 16px; color: ${urgencyColor}; margin: 5px 0 0 0;">days remaining to pay</div>
    </div>

    <p>Dear ${letterData.debtorName},</p>

    <p>We are writing to you on behalf of <strong>${letterData.client.clientName}</strong> regarding an outstanding payment that requires your <strong>immediate attention</strong>.</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 10px 0;"><strong>Creditor:</strong> ${letterData.client.clientName}</p>
      <p style="margin: 0 0 10px 0; font-size: 24px; color: #dc2626;"><strong>Amount Outstanding: £${letterData.amountOwed}</strong></p>
      <p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${letterData.claimDescription}</p>
      <p style="margin: 0;"><strong>Payment Deadline:</strong> ${new Date(letterData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>

    ${paymentLink ? `
    <!-- Payment CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentLink}" style="display: inline-block; background-color: #16a34a; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        PAY NOW - £${letterData.amountOwed}
      </a>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Click to view payment options and settle this debt</p>
    </div>
    ` : ''}

    <p><strong>Please find attached:</strong></p>
    <ul style="padding-left: 20px; margin: 10px 0 20px 0;">
      <li>A formal demand letter with full details and payment instructions</li>
      ${letterData.attachments && letterData.attachments.length > 0 ? `<li>Supporting documentation (${letterData.attachments.length} document${letterData.attachments.length > 1 ? 's' : ''})</li>` : ''}
    </ul>

    <!-- Social Proof Nudge -->
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #1e40af;">✓ Why companies pay promptly:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e3a8a;">
        <li>Avoid legal costs and court proceedings</li>
        <li>Protect business credit rating</li>
        <li>Maintain professional reputation</li>
        <li>Prevent enforcement action</li>
      </ul>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Action Required:</strong> Payment must be received by ${new Date(letterData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to avoid further action. Failure to pay may result in additional costs, legal proceedings, and enforcement action.
      </p>
    </div>

    ${paymentLink ? `
    <div style="text-align: center; margin: 20px 0; padding: 20px; background-color: white; border: 2px dashed #cbd5e1; border-radius: 8px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong>Quick Payment Link:</strong></p>
      <a href="${paymentLink}" style="color: #2563eb; word-break: break-all; font-size: 12px;">${paymentLink}</a>
    </div>
    ` : ''}

    <p style="font-size: 13px; color: #666; margin-top: 30px;">
      This is a formal notice issued via Smart Settle Go on behalf of ${letterData.client.clientName}. Reference: ${submissionId ? submissionId.slice(-8).toUpperCase() : 'N/A'}
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
      This email was sent on behalf of ${letterData.client.clientName} via Smart Settle Go<br>
      <a href="https://www.smart-settle-go.com" style="color: #2563eb; text-decoration: none;">www.smart-settle-go.com</a>
    </p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Sends a confirmation email to the client
 */
export async function sendClientConfirmation(letterData: LetterData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Smart Settle Go <onboarding@resend.dev>',
      to: letterData.client.clientEmail,
      subject: `Your demand letter has been sent to ${letterData.debtorName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">✓ Letter Sent Successfully</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
    <p>Dear ${letterData.client.clientName},</p>

    <p>We are pleased to confirm that your demand letter has been successfully delivered to <strong>${letterData.debtorName}</strong> via email at ${letterData.debtorEmail}.</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #10b981;">Delivery Confirmation</h3>
      <p style="margin: 0 0 10px 0;"><strong>Recipient:</strong> ${letterData.debtorName}</p>
      <p style="margin: 0 0 10px 0;"><strong>Amount Claimed:</strong> £${letterData.amountOwed}</p>
      <p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${letterData.claimDescription}</p>
      <p style="margin: 0 0 10px 0;"><strong>Payment Deadline:</strong> ${new Date(letterData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="margin: 0;"><strong>Sent:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>

    <h3 style="color: #2563eb;">Next Steps</h3>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li><strong>${letterData.debtorName}</strong> has received your formal demand letter and all supporting documentation</li>
      <li>The payment deadline is <strong>${new Date(letterData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></li>
      <li>Keep this email as proof of delivery</li>
      <li>If the debtor contacts you, respond directly - all communication about payment should be between you and them</li>
      <li>If payment is not received by the deadline, you may wish to consider further action</li>
    </ul>

    <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Important Reminder:</strong> Smart Settle Go has facilitated the delivery of your demand letter. All further correspondence, negotiations, and payment arrangements are between you and ${letterData.debtorName}. We do not provide legal advice or mediate disputes.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
      Thank you for using Smart Settle Go<br>
      <a href="https://www.smart-settle-go.com" style="color: #2563eb; text-decoration: none;">www.smart-settle-go.com</a>
    </p>
  </div>

</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error('Client confirmation email error:', error);
      throw new Error(`Failed to send confirmation: ${error.message}`);
    }

    console.log('Client confirmation sent:', data);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Client confirmation error:', error);
    throw error;
  }
}

/**
 * Sends demand letter PDF to client for self-delivery
 */
export async function sendSelfDeliveryLetter(letterData: LetterData) {
  try {
    // Generate demand letter PDF
    // @ts-expect-error - @react-pdf types don't match but work correctly at runtime
    const letterStream = await renderToStream(React.createElement(LetterPDF, { data: letterData }));
    const letterChunks: Uint8Array[] = [];
    for await (const chunk of letterStream) {
      letterChunks.push(chunk as Uint8Array);
    }
    const letterPdfBuffer = Buffer.concat(letterChunks);

    // Generate certificate of service PDF
    // @ts-expect-error - @react-pdf types don't match but work correctly at runtime
    const certificateStream = await renderToStream(React.createElement(CertificateOfService, { data: letterData }));
    const certificateChunks: Uint8Array[] = [];
    for await (const chunk of certificateStream) {
      certificateChunks.push(chunk as Uint8Array);
    }
    const certificatePdfBuffer = Buffer.concat(certificateChunks);

    // Create filenames
    const letterFilename = `demand-letter-${letterData.debtorName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    const certificateFilename = `certificate-of-service-${letterData.debtorName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;

    // Prepare attachments array with the PDF, certificate, and user attachments
    const attachments: any[] = [
      {
        filename: letterFilename,
        content: letterPdfBuffer,
      },
      {
        filename: certificateFilename,
        content: certificatePdfBuffer,
      },
    ];

    // Add user's supporting documents
    if (letterData.attachments && letterData.attachments.length > 0) {
      letterData.attachments.forEach(attachment => {
        attachments.push({
          filename: attachment.fileName,
          content: Buffer.from(attachment.fileData, 'base64'),
        });
      });
    }

    const { data, error } = await resend.emails.send({
      from: 'Smart Settle Go <onboarding@resend.dev>',
      to: letterData.client.clientEmail,
      subject: `Your Demand Letter is Ready - ${letterData.debtorName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">✓ Your Demand Letter is Ready</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
    <p>Dear ${letterData.client.clientName},</p>

    <p>Your demand letter has been prepared and is attached to this email, ready for you to deliver to <strong>${letterData.debtorName}</strong>.</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #10b981;">Letter Details</h3>
      <p style="margin: 0 0 10px 0;"><strong>Recipient:</strong> ${letterData.debtorName}</p>
      <p style="margin: 0 0 10px 0;"><strong>Amount Claimed:</strong> £${letterData.amountOwed}</p>
      <p style="margin: 0 0 10px 0;"><strong>Description:</strong> ${letterData.claimDescription}</p>
      <p style="margin: 0;"><strong>Payment Deadline:</strong> ${new Date(letterData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>📎 Attachments:</strong> This email includes:
      </p>
      <ul style="margin: 8px 0 0 20px; font-size: 14px;">
        <li>Your demand letter PDF</li>
        <li>Certificate of Service form (fill this out after delivery as proof)</li>
        ${letterData.attachments && letterData.attachments.length > 0 ? `<li>${letterData.attachments.length} supporting document${letterData.attachments.length > 1 ? 's' : ''}</li>` : ''}
      </ul>
    </div>

    <h3 style="color: #2563eb;">How to Deliver Your Letter</h3>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li><strong>Print the PDF</strong> - Use a good quality printer for a professional appearance</li>
      <li><strong>Choose your delivery method:</strong>
        <ul style="margin-top: 8px;">
          <li><strong>Recorded Delivery</strong> - Provides proof of delivery (recommended)</li>
          <li><strong>Hand Delivery</strong> - Personal delivery with a witness if possible</li>
          <li><strong>Email</strong> - If you have the debtor's email address</li>
        </ul>
      </li>
      <li><strong>Complete the Certificate of Service</strong> - After delivering the letter, fill out the attached certificate form with delivery details</li>
      <li><strong>Keep proof of delivery</strong> - Store the completed certificate and any postal receipts safely</li>
      <li><strong>Wait for the deadline</strong> - The debtor has until ${new Date(letterData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to respond</li>
    </ul>

    <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px;">
        <strong>Certificate of Service:</strong>
      </p>
      <p style="margin: 0; font-size: 14px;">
        The attached certificate should be completed immediately after delivery and kept as proof of service. This may be required if you need to take further legal action. Include details such as date, time, method of delivery, and tracking numbers where applicable.
      </p>
    </div>

    <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;">
        <strong>Important:</strong> Keep this email and all attachments as evidence. All communication and negotiation regarding payment should be directly between you and ${letterData.debtorName}. Smart Settle Go does not provide legal advice or mediate disputes.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
      Thank you for using Smart Settle Go<br>
      <a href="https://www.smart-settle-go.com" style="color: #2563eb; text-decoration: none;">www.smart-settle-go.com</a>
    </p>
  </div>

</body>
</html>
      `.trim(),
      attachments: attachments,
    });

    if (error) {
      console.error('Self-delivery email error:', error);
      throw new Error(`Failed to send self-delivery email: ${error.message}`);
    }

    console.log('Self-delivery letter sent:', data);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Self-delivery error:', error);
    throw error;
  }
}

/**
 * Sends a rejection email to the client
 */
export async function sendRejectionEmail(options: {
  to: string;
  clientName: string;
  rejectionReason: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Smart Settle Go <onboarding@resend.dev>',
      to: options.to,
      subject: 'Your demand letter submission requires revision',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Submission Requires Revision</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
    <p>Dear ${options.clientName},</p>

    <p>Thank you for your submission to Smart Settle Go. Unfortunately, we are unable to process your demand letter at this time.</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #ef4444;">Reason for Rejection</h3>
      <p style="margin: 0; white-space: pre-wrap;">${options.rejectionReason}</p>
    </div>

    <h3 style="color: #2563eb;">What to Do Next</h3>
    <ul style="padding-left: 20px;">
      <li>Review the reason for rejection above</li>
      <li>Make the necessary corrections to your submission</li>
      <li>If you have already paid, please contact us for a refund or to resubmit</li>
      <li>If you have questions, feel free to reach out to our support team</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.smart-settle-go.com" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Submit a New Request</a>
    </div>

    <p style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px;">
      <strong>Need Help?</strong> If you need assistance correcting your submission or have questions about this rejection, please reply to this email or visit our website.
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
      Smart Settle Go - Professional Debt Recovery Services<br>
      <a href="https://www.smart-settle-go.com" style="color: #2563eb; text-decoration: none;">www.smart-settle-go.com</a>
    </p>
  </div>

</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error('Rejection email error:', error);
      throw new Error(`Failed to send rejection email: ${error.message}`);
    }

    console.log('Rejection email sent:', data);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Rejection email error:', error);
    throw error;
  }
}

/**
 * Sends an admin notification email when a new submission is received
 */
export async function sendAdminNotification(options: {
  submissionId: string;
  clientName: string;
  clientEmail: string;
  debtorName: string;
  amountOwed: string;
  claimDescription: string;
  flaggedReasons?: string[];
}) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured - skipping admin notification');
      return { success: false, reason: 'No admin email configured' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const reviewUrl = `${baseUrl}/admin`;
    const shortId = options.submissionId.slice(-8).toUpperCase();

    const { data, error } = await resend.emails.send({
      from: 'Smart Settle Go <onboarding@resend.dev>',
      to: adminEmail,
      subject: `⚠️ New Submission for Review - ${options.clientName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ New Submission for Review</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-top: 0;">A new demand letter submission is waiting for your review and approval.</p>

    <div style="background-color: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #f59e0b;">Submission Details</h3>
      <p style="margin: 5px 0;"><strong>Reference:</strong> ${shortId}</p>
      <p style="margin: 5px 0;"><strong>Client:</strong> ${options.clientName}</p>
      <p style="margin: 5px 0;"><strong>Client Email:</strong> ${options.clientEmail}</p>
      <p style="margin: 5px 0;"><strong>Debtor:</strong> ${options.debtorName}</p>
      <p style="margin: 5px 0;"><strong>Amount:</strong> £${options.amountOwed}</p>
      <p style="margin: 5px 0;"><strong>Claim:</strong> ${options.claimDescription}</p>
    </div>

    ${options.flaggedReasons && options.flaggedReasons.length > 0 ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">⚠️ Flagged for Review:</p>
      <ul style="margin: 0; padding-left: 20px; color: #92400e;">
        ${options.flaggedReasons.map(reason => `<li style="margin: 5px 0;">${reason}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${reviewUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Review Submission
      </a>
    </div>

    <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #075985;">
        <strong>Action Required:</strong> Please review this submission in the admin dashboard and either approve or reject it. The client is waiting for their demand letter to be sent.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
      Smart Settle Go - Admin Notification<br>
      <a href="${reviewUrl}" style="color: #2563eb; text-decoration: none;">${reviewUrl}</a>
    </p>
  </div>

</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error('Admin notification email error:', error);
      throw new Error(`Failed to send admin notification: ${error.message}`);
    }

    console.log('Admin notification sent:', data);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Admin notification error:', error);
    throw error;
  }
}
