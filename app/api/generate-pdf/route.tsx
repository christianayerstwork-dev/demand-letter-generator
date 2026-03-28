import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { LetterPDF } from '@/lib/pdfGenerator';
import { LetterData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const data: LetterData = await request.json();

    // Validate required fields
    if (!data.client?.clientName || !data.debtorName || !data.amountOwed) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate PDF using createElement
    const stream = await renderToStream(React.createElement(LetterPDF, { data }));

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Create filename
    const filename = `demand-letter-${data.debtorName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;

    // Return PDF as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
