import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { LetterData } from '@/types';
import { generateLetter } from './letterTemplate';
import { format } from 'date-fns';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 30,
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 9,
    color: '#6b7280',
  },
  date: {
    textAlign: 'right',
    marginBottom: 30,
    fontSize: 10,
  },
  greeting: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  text: {
    textAlign: 'justify',
  },
  closing: {
    marginTop: 30,
    marginBottom: 10,
  },
  signature: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  bankDetails: {
    marginTop: 25,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  bankDetailsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 10,
  },
  bankDetailsText: {
    fontSize: 9,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 10,
  },
  companyInfo: {
    fontSize: 7,
    marginTop: 2,
  },
});

interface LetterPDFProps {
  data: LetterData;
}

export const LetterPDF: React.FC<LetterPDFProps> = ({ data }) => {
  const letterContent = generateLetter(data);
  const today = format(new Date(), 'do MMMM yyyy');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          {data.logo ? (
            <Image src={data.logo} style={{ width: 150, height: 'auto', marginBottom: 10 }} />
          ) : (
            <>
              <Text style={styles.logo}>SMART SETTLE GO</Text>
              <Text style={styles.tagline}>Professional Debt Recovery Services</Text>
            </>
          )}
        </View>

        {/* Date */}
        <Text style={styles.date}>{today}</Text>

        {/* Greeting */}
        <Text style={styles.greeting}>{letterContent.greeting}</Text>

        {/* Opening */}
        <View style={styles.section}>
          <Text style={styles.text}>{letterContent.opening}</Text>
        </View>

        {/* Body */}
        <View style={styles.section}>
          <Text style={styles.text}>{letterContent.body}</Text>
        </View>

        {/* Closing */}
        <View style={styles.closing}>
          <Text>{letterContent.closing}</Text>
        </View>

        {/* Signature Box */}
        <View style={{ marginTop: 20, marginBottom: 10 }}>
          {data.signature ? (
            <View style={{ marginBottom: 5 }}>
              <Image src={data.signature} style={{ width: 150, height: 'auto', marginBottom: 5 }} />
              <Text style={styles.signature}>{letterContent.signature}</Text>
            </View>
          ) : (
            <>
              <View style={{
                borderBottom: '1pt solid #000',
                width: 200,
                paddingBottom: 30,
                marginBottom: 5
              }}>
                {/* Space for handwritten signature */}
              </View>
              <Text style={styles.signature}>{letterContent.signature}</Text>
            </>
          )}
        </View>

        {/* Bank Details (if provided) */}
        {(data.client.bankName || data.client.accountNumber || data.client.sortCode) && (
          <View style={styles.bankDetails}>
            <Text style={styles.bankDetailsTitle}>Payment Details</Text>
            {data.client.bankName && (
              <Text style={styles.bankDetailsText}>Bank Name: {data.client.bankName}</Text>
            )}
            {data.client.sortCode && (
              <Text style={styles.bankDetailsText}>Sort Code: {data.client.sortCode}</Text>
            )}
            {data.client.accountNumber && (
              <Text style={styles.bankDetailsText}>Account Number: {data.client.accountNumber}</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{fontWeight: 'bold', marginBottom: 5}}>
            Smart Settle Go - Professional Debt Recovery Services
          </Text>
          <Text>
            Website: www.smart-settle-go.com | Email: info@smart-settle-go.com
          </Text>
          <Text style={styles.companyInfo}>
            Smart Settle Go Ltd | Company Registration: [Your Company Number] | Registered Office: [Your Address]
          </Text>
          <Text style={{marginTop: 5}}>
            For enquiries, please contact the sender directly using the details provided above.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default LetterPDF;
