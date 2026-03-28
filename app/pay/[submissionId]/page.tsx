'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

export default function PaymentPage({ params }: { params: { submissionId: string } }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid payment link');
      setLoading(false);
      return;
    }

    // Track the click and fetch payment details
    const trackAndFetch = async () => {
      try {
        const response = await fetch(`/api/pay/${params.submissionId}?token=${token}`);
        const result = await response.json();

        if (response.ok) {
          setData(result);
        } else {
          setError(result.error || 'Invalid or expired payment link');
        }
      } catch (err) {
        setError('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    trackAndFetch();
  }, [params.submissionId, token]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  const daysUntilPayment = Math.ceil((new Date(data.paymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilPayment < 0;
  const isUrgent = daysUntilPayment <= 7 && daysUntilPayment >= 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="bg-blue-600 text-white rounded-t-lg p-8 text-center">
          <h1 className="text-3xl font-bold mb-2">SMART SETTLE GO</h1>
          <p className="text-blue-100">Professional Debt Recovery Services</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-b-lg shadow-lg p-8">
          {/* Urgency Banner */}
          {isOverdue ? (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-6 text-center">
              <p className="text-red-800 font-bold text-lg">⚠️ PAYMENT OVERDUE</p>
              <p className="text-red-600 mt-1">This payment was due {Math.abs(daysUntilPayment)} days ago</p>
            </div>
          ) : isUrgent ? (
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 mb-6 text-center">
              <p className="text-yellow-800 font-bold text-lg">⏰ URGENT: {daysUntilPayment} DAYS REMAINING</p>
              <p className="text-yellow-600 mt-1">Payment must be received by {format(new Date(data.paymentDate), 'MMMM d, yyyy')}</p>
            </div>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 mb-6 text-center">
              <p className="text-blue-800 font-bold text-lg">Payment Due: {format(new Date(data.paymentDate), 'MMMM d, yyyy')}</p>
              <p className="text-blue-600 mt-1">{daysUntilPayment} days remaining</p>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h2>

          {/* Amount Card */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-600 rounded-lg p-6 mb-6">
            <p className="text-sm text-red-800 font-medium mb-1">Amount Outstanding</p>
            <p className="text-4xl font-bold text-red-700">£{data.amountOwed}</p>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-8">
            <div>
              <p className="text-sm text-gray-600 font-medium">Creditor</p>
              <p className="text-lg text-gray-900">{data.creditorName}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 font-medium">Description</p>
              <p className="text-lg text-gray-900">{data.description}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 font-medium">Reference Number</p>
              <p className="text-lg text-gray-900 font-mono">{data.reference}</p>
            </div>
          </div>

          {/* Payment Instructions */}
          {data.bankDetails && (
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">How to Pay</h3>

              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-sm text-gray-600 font-medium mb-4">Bank Transfer Details:</p>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank Name:</span>
                    <span className="font-semibold text-gray-900">{data.bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sort Code:</span>
                    <span className="font-semibold text-gray-900 font-mono">{data.bankDetails.sortCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Number:</span>
                    <span className="font-semibold text-gray-900 font-mono">{data.bankDetails.accountNumber}</span>
                  </div>
                  {data.bankDetails.accountName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Name:</span>
                      <span className="font-semibold text-gray-900">{data.bankDetails.accountName}</span>
                    </div>
                  )}
                  <div className="flex justify-between bg-yellow-100 -mx-6 px-6 py-3 mt-4">
                    <span className="text-gray-900 font-medium">⚠️ Reference (IMPORTANT):</span>
                    <span className="font-bold text-gray-900 font-mono">{data.reference}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-4">
                  Please include the reference number with your payment so we can identify it correctly.
                </p>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Questions or Disputes?</h3>
            <p className="text-sm text-blue-800">
              If you have questions about this debt or wish to dispute it, please contact {data.creditorName} directly using the contact details provided in the demand letter sent to you.
            </p>
          </div>

          {/* Footer Notice */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>This payment page is provided by Smart Settle Go on behalf of {data.creditorName}</p>
            <p className="mt-1">All payments should be made directly to the account details shown above</p>
          </div>
        </div>
      </div>
    </main>
  );
}
