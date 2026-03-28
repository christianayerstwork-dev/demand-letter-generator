import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { LetterData } from '@/types';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2563eb',
    borderBottom: '2 solid #2563eb',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    width: '60%',
  },
  checkbox: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  checkboxBox: {
    width: 15,
    height: 15,
    border: '2 solid #000',
    marginRight: 10,
  },
  signatureSection: {
    marginTop: 30,
    borderTop: '1 solid #ccc',
    paddingTop: 20,
  },
  signatureLine: {
    borderBottom: '1 solid #000',
    width: '60%',
    marginTop: 30,
    marginBottom: 5,
  },
  instructions: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  notice: {
    backgroundColor: '#f0f9ff',
    border: '1 solid #2563eb',
    padding: 15,
    marginTop: 30,
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
});

interface CertificateProps {
  data: LetterData;
}

export const CertificateOfService: React.FC<CertificateProps> = ({ data }) => {
  const today = format(new Date(), 'do MMMM yyyy');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CERTIFICATE OF SERVICE</Text>
          <Text style={styles.subtitle}>Proof of Delivery - Demand Letter</Text>
        </View>

        {/* Letter Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Letter Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Sent by:</Text>
            <Text style={styles.value}>{data.client.clientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Served upon:</Text>
            <Text style={styles.value}>{data.debtorName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{data.debtorAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount claimed:</Text>
            <Text style={styles.value}>£{data.amountOwed}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Description:</Text>
            <Text style={styles.value}>{data.claimDescription}</Text>
          </View>
        </View>

        {/* Delivery Details - To be filled in */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details (To be completed by sender)</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Date of delivery:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 20 }]}>{'                                        '}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Time of delivery:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 20 }]}>{'                                        '}</Text>
          </View>
        </View>

        {/* Method of Delivery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Method of Delivery (Check one)</Text>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Hand delivered to the debtor personally</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Hand delivered to the debtor's address (left with occupant)</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Posted via Royal Mail First Class</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Posted via Royal Mail Recorded Delivery</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Posted via Royal Mail Special Delivery</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Sent via email to: _______________________________________</Text>
          </View>
          <View style={styles.checkbox}>
            <View style={styles.checkboxBox} />
            <Text>Other: _______________________________________________</Text>
          </View>
        </View>

        {/* Tracking/Reference */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Tracking/Reference number:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 20 }]}>{'                                        '}</Text>
          </View>
          <Text style={styles.instructions}>
            (If applicable - for recorded or special delivery)
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Declaration</Text>
          <Text style={{ marginBottom: 20, fontSize: 10 }}>
            I certify that I delivered the demand letter as described above.
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Delivered by (name):</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 20 }]}>{'                                        '}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Signature:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 30 }]}>{'                                        '}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Date signed:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 20 }]}>{'                                        '}</Text>
          </View>
        </View>

        {/* Witness Section (Optional) */}
        <View style={[styles.section, { marginTop: 20, backgroundColor: '#f9fafb', padding: 10 }]}>
          <Text style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 10 }}>
            Witness Details (Optional but recommended for hand delivery)
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Witness name:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 20 }]}>{'                                        '}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Witness signature:</Text>
            <Text style={[styles.value, { borderBottom: '1 solid #000', minHeight: 30 }]}>{'                                        '}</Text>
          </View>
        </View>

        {/* Important Notice */}
        <View style={styles.notice}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Important:</Text>
          <Text>
            Keep this completed certificate with your records as proof of service. This document may be required
            if you need to take further legal action. For recorded or special delivery, attach the Royal Mail
            certificate of posting or proof of delivery.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Certificate generated by Smart Settle Go on {today}</Text>
          <Text>www.smart-settle-go.com</Text>
        </View>
      </Page>
    </Document>
  );
};
