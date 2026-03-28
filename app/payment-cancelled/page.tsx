'use client';

import Link from 'next/link';

export default function PaymentCancelled() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Warning Icon */}
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>

        <p className="text-gray-600 mb-6">
          You cancelled the payment process. No charges were made to your account.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            Your letter details have not been saved. You'll need to fill out the form again if you'd like to proceed.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Form
          </Link>

          <p className="text-xs text-gray-500">
            Need help? Contact us at support@smart-settle-go.com
          </p>
        </div>
      </div>
    </main>
  );
}
