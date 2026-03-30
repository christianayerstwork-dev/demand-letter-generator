'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { generateLetter } from '@/lib/letterTemplate';
import { format } from 'date-fns';
import { calculateStatistics, Statistics } from '@/lib/statisticsUtils';
import { Attachment } from '@/types';

interface Submission {
  id: string;
  letterData: any;
  stripeSessionId: string;
  status: 'pending' | 'approved' | 'rejected';
  flaggedReasons: string[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;

  // Tracking fields
  paymentStatus?: 'unpaid' | 'paid' | 'partial' | 'dispute';
  paymentReceivedDate?: string;
  paymentAmount?: number;
  paymentNotes?: string;
  emailDelivered?: boolean;
  emailDeliveredAt?: string;
  emailOpened?: boolean;
  emailOpenedAt?: string;
  emailOpenCount?: number;
  emailClicked?: boolean;
  emailClickedAt?: string;
  paymentLinkToken?: string;
  paymentLinkClicked?: boolean;
  paymentLinkClickedAt?: string;
  paymentLinkClickCount?: number;
  debtorResponded?: boolean;
  debtorResponseDate?: string;
  debtorResponseNotes?: string;
  caseClosed?: boolean;
  caseClosedDate?: string;
  caseClosureReason?: 'paid_full' | 'paid_partial' | 'no_response' | 'dispute' | 'withdrawn';
  caseNotes?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<Submission | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [trackingSubmission, setTrackingSubmission] = useState<Submission | null>(null);
  const [trackingFormData, setTrackingFormData] = useState<any>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch submissions only after authentication is confirmed
  useEffect(() => {
    if (authenticated) {
      fetchSubmissions();
    }
  }, [authenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/verify');
      if (response.ok) {
        setAuthenticated(true);
        setAuthChecking(false);
      } else {
        // Not authenticated - redirect to login
        window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/admin/login';
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/admin/submissions', {
        credentials: 'include',
      });

      if (response.status === 401) {
        // Session expired
        window.location.href = '/admin/login';
        return;
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this submission and send the letter?')) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        alert('Submission approved! Letter has been sent.');
        fetchSubmissions();
        setSelectedSubmission(null);
      } else {
        const error = await response.json();
        console.error('Approval failed:', error);
        alert(`Failed to approve submission: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Approval error:', error);
      alert('Error approving submission');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (submission: Submission) => {
    setRejectingSubmission(submission);
    setRejectionMessage('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingSubmission) return;

    if (!rejectionMessage.trim()) {
      alert('Please provide a reason for rejection to send to the client.');
      return;
    }

    setProcessingId(rejectingSubmission.id);
    try {
      const response = await fetch(`/api/admin/submissions/${rejectingSubmission.id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: rejectionMessage }),
      });

      if (response.ok) {
        alert('Submission rejected and client has been notified via email.');
        fetchSubmissions();
        setSelectedSubmission(null);
        setRejectingSubmission(null);
        setRejectionMessage('');
      } else {
        alert('Failed to reject submission');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Error rejecting submission');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEdit = (submission: Submission) => {
    setEditingSubmission(submission);
    setEditFormData({ ...submission.letterData });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditFormData((prev: any) => {
      if (field.startsWith('client.')) {
        const clientField = field.split('.')[1];
        return {
          ...prev,
          client: {
            ...prev.client,
            [clientField]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSubmission) return;

    setProcessingId(editingSubmission.id);
    try {
      const response = await fetch(`/api/admin/submissions/${editingSubmission.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ letterData: editFormData }),
      });

      if (response.ok) {
        alert('Submission updated successfully!');
        fetchSubmissions();
        setEditingSubmission(null);
        setEditFormData(null);
      } else {
        alert('Failed to update submission');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Error updating submission');
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewAttachment = (attachment: any) => {
    // Convert base64 to blob and open in new tab
    try {
      const byteCharacters = atob(attachment.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.fileType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error viewing attachment:', error);
      alert('Failed to view attachment');
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    // Convert base64 to blob and download
    try {
      const byteCharacters = atob(attachment.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment');
    }
  };

  const handleTrackStatus = (submission: Submission) => {
    setTrackingSubmission(submission);
    setTrackingFormData({
      paymentStatus: submission.paymentStatus || 'unpaid',
      paymentReceivedDate: submission.paymentReceivedDate || '',
      paymentAmount: submission.paymentAmount || '',
      paymentNotes: submission.paymentNotes || '',
      debtorResponded: submission.debtorResponded || false,
      debtorResponseDate: submission.debtorResponseDate || '',
      debtorResponseNotes: submission.debtorResponseNotes || '',
      caseClosed: submission.caseClosed || false,
      caseClosedDate: submission.caseClosedDate || '',
      caseClosureReason: submission.caseClosureReason || '',
      caseNotes: submission.caseNotes || '',
    });
  };

  const handleSaveTracking = async () => {
    if (!trackingSubmission) return;

    setProcessingId(trackingSubmission.id);
    try {
      const response = await fetch(`/api/admin/submissions/${trackingSubmission.id}/tracking`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingFormData),
      });

      if (response.ok) {
        alert('Tracking updated successfully!');
        fetchSubmissions();
        setTrackingSubmission(null);
        setTrackingFormData(null);
      } else {
        alert('Failed to update tracking');
      }
    } catch (error) {
      console.error('Tracking update error:', error);
      alert('Error updating tracking');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const approvedSubmissions = submissions.filter(s => s.status === 'approved');
  const rejectedSubmissions = submissions.filter(s => s.status === 'rejected');

  // Calculate statistics
  const stats = useMemo(() => calculateStatistics(submissions), [submissions]);

  // Show loading while checking authentication
  if (authChecking || !authenticated) {
    return (
      <main className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Review flagged submissions</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </a>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Pending Review</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">{pendingSubmissions.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Approved</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {submissions.filter(s => s.status === 'approved').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Rejected</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {submissions.filter(s => s.status === 'rejected').length}
            </p>
          </div>
        </div>

        {/* Comprehensive Statistics Dashboard */}
        {stats.totalSent > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📊 Performance Analytics</h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900">Letters Sent</h3>
                <p className="text-3xl font-bold text-blue-700 mt-2">{stats.totalSent}</p>
                <p className="text-xs text-blue-600 mt-1">Total approved & sent</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
                <h3 className="text-sm font-medium text-green-900">Payment Rate</h3>
                <p className="text-3xl font-bold text-green-700 mt-2">{stats.paymentRate.toFixed(1)}%</p>
                <p className="text-xs text-green-600 mt-1">{stats.totalPaid + stats.totalPartial} of {stats.totalSent} paid</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border border-purple-200">
                <h3 className="text-sm font-medium text-purple-900">Recovery Rate</h3>
                <p className="text-3xl font-bold text-purple-700 mt-2">{stats.averageRecoveryRate.toFixed(1)}%</p>
                <p className="text-xs text-purple-600 mt-1">£{stats.totalAmountRecovered.toFixed(0)} of £{stats.totalAmountClaimed.toFixed(0)}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow p-6 border border-yellow-200">
                <h3 className="text-sm font-medium text-yellow-900">Avg Response Time</h3>
                <p className="text-3xl font-bold text-yellow-700 mt-2">{stats.averageResponseTimeDays.toFixed(1)}</p>
                <p className="text-xs text-yellow-600 mt-1">days ({stats.responseRate.toFixed(0)}% respond)</p>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Amount Claimed:</span>
                    <span className="text-lg font-bold text-gray-900">£{stats.totalAmountClaimed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Amount Recovered:</span>
                    <span className="text-lg font-bold text-green-600">£{stats.totalAmountRecovered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-600">Average Claim Amount:</span>
                    <span className="text-md font-semibold text-gray-700">£{stats.averageClaimAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Recovery Amount:</span>
                    <span className="text-md font-semibold text-gray-700">£{stats.averageRecoveryAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Payment Status Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">✓ Paid in Full:</span>
                    <span className="text-lg font-bold text-green-600">{stats.totalPaid} ({stats.fullPaymentRate.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">⚡ Partial Payment:</span>
                    <span className="text-lg font-bold text-yellow-600">{stats.totalPartial}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">⏳ Unpaid:</span>
                    <span className="text-lg font-bold text-gray-600">{stats.totalUnpaid}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">⚠️ Dispute:</span>
                    <span className="text-lg font-bold text-red-600">{stats.totalDispute}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Time Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Best Time to Send</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">🌅 Morning (6am-12pm):</span>
                    <div className="text-right">
                      <span className="text-md font-bold text-gray-900">{stats.sendTimeAnalysis.morning.paymentRate.toFixed(1)}%</span>
                      <span className="text-xs text-gray-500 ml-2">({stats.sendTimeAnalysis.morning.paid}/{stats.sendTimeAnalysis.morning.sent})</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">☀️ Afternoon (12pm-6pm):</span>
                    <div className="text-right">
                      <span className="text-md font-bold text-gray-900">{stats.sendTimeAnalysis.afternoon.paymentRate.toFixed(1)}%</span>
                      <span className="text-xs text-gray-500 ml-2">({stats.sendTimeAnalysis.afternoon.paid}/{stats.sendTimeAnalysis.afternoon.sent})</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">🌆 Evening (6pm-12am):</span>
                    <div className="text-right">
                      <span className="text-md font-bold text-gray-900">{stats.sendTimeAnalysis.evening.paymentRate.toFixed(1)}%</span>
                      <span className="text-xs text-gray-500 ml-2">({stats.sendTimeAnalysis.evening.paid}/{stats.sendTimeAnalysis.evening.sent})</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">🌙 Night (12am-6am):</span>
                    <div className="text-right">
                      <span className="text-md font-bold text-gray-900">{stats.sendTimeAnalysis.night.paymentRate.toFixed(1)}%</span>
                      <span className="text-xs text-gray-500 ml-2">({stats.sendTimeAnalysis.night.paid}/{stats.sendTimeAnalysis.night.sent})</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Delivery Method Comparison</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-700">Email Delivery</span>
                      <span className="text-lg font-bold text-blue-700">{stats.deliveryMethodAnalysis.email.paymentRate.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {stats.deliveryMethodAnalysis.email.sent} sent, {stats.deliveryMethodAnalysis.email.paid} paid
                      · Recovery: {stats.deliveryMethodAnalysis.email.avgRecoveryRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-purple-700">Self Delivery</span>
                      <span className="text-lg font-bold text-purple-700">{stats.deliveryMethodAnalysis.self.paymentRate.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {stats.deliveryMethodAnalysis.self.sent} sent, {stats.deliveryMethodAnalysis.self.paid} paid
                      · Recovery: {stats.deliveryMethodAnalysis.self.avgRecoveryRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Day of Week Analysis */}
            {Object.keys(stats.dayOfWeekAnalysis).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Best Day to Send</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const dayData = stats.dayOfWeekAnalysis[day];
                    if (!dayData || dayData.sent === 0) return null;
                    return (
                      <div key={day} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs font-medium text-gray-600 mb-1">{day.slice(0, 3)}</div>
                        <div className="text-2xl font-bold text-gray-900">{dayData.paymentRate.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500 mt-1">{dayData.paid}/{dayData.sent}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Submissions */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Pending Review ({pendingSubmissions.length})
          </h2>

          {pendingSubmissions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl text-gray-600">No pending submissions</p>
              <p className="text-sm text-gray-500 mt-2">All submissions have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                            PENDING REVIEW
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {submission.letterData.client.clientName} → {submission.letterData.debtorName}
                        </h3>

                        <p className="text-sm text-gray-600 mb-3">
                          £{submission.letterData.amountOwed} - {submission.letterData.claimDescription}
                        </p>

                        {/* Flagged Reasons */}
                        <div className="mb-3">
                          <p className="text-sm font-medium text-red-700 mb-2">⚠️ Flagged for:</p>
                          <ul className="space-y-1">
                            {submission.flaggedReasons.map((reason, index) => (
                              <li key={index} className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Full Letter →
                        </button>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(submission)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleApprove(submission.id)}
                          disabled={processingId === submission.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === submission.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(submission)}
                          disabled={processingId === submission.id}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Submissions */}
        {approvedSubmissions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Approved Letters ({approvedSubmissions.length})
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client → Debtor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Delivery Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engagement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvedSubmissions.slice(0, 10).map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.letterData.client.clientName} → {submission.letterData.debtorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        £{submission.letterData.amountOwed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {submission.letterData.paymentDate
                          ? format(new Date(submission.letterData.paymentDate), 'MMM d, yyyy')
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.letterData.deliveryMethod === 'email'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {submission.letterData.deliveryMethod === 'email' ? 'Email' : 'Self-Delivery'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.reviewedAt
                          ? format(new Date(submission.reviewedAt), 'MMM d, h:mm a')
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          submission.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          submission.paymentStatus === 'dispute' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.paymentStatus === 'paid' ? '✓ Paid' :
                           submission.paymentStatus === 'partial' ? 'Partial' :
                           submission.paymentStatus === 'dispute' ? 'Dispute' :
                           'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          {submission.emailOpened && (
                            <span className="text-blue-600" title={`Opened ${submission.emailOpenCount || 1}x`}>
                              📧 {submission.emailOpenCount || 1}x
                            </span>
                          )}
                          {submission.paymentLinkClicked && (
                            <span className="text-green-600" title={`Payment link clicked ${submission.paymentLinkClickCount || 1}x`}>
                              💳 {submission.paymentLinkClickCount || 1}x
                            </span>
                          )}
                          {!submission.emailOpened && !submission.paymentLinkClicked && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleTrackStatus(submission)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rejected Submissions */}
        {rejectedSubmissions.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Rejected Submissions ({rejectedSubmissions.length})
            </h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client → Debtor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rejected Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rejectedSubmissions.slice(0, 10).map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.letterData.client.clientName} → {submission.letterData.debtorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        £{submission.letterData.amountOwed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {submission.letterData.paymentDate
                          ? format(new Date(submission.letterData.paymentDate), 'MMM d, yyyy')
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.reviewedAt
                          ? format(new Date(submission.reviewedAt), 'MMM d, h:mm a')
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Letter Preview Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">Letter Preview</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="border rounded-lg p-6 bg-gray-50 mb-4">
                {(() => {
                  const letter = generateLetter(selectedSubmission.letterData);
                  return (
                    <div className="space-y-4 font-serif">
                      <p className="text-sm text-gray-600">{format(new Date(), 'do MMMM yyyy')}</p>
                      <p className="font-semibold">{letter.greeting}</p>
                      <p className="whitespace-pre-wrap">{letter.opening}</p>
                      <p className="whitespace-pre-wrap">{letter.body}</p>
                      <p>{letter.closing}</p>
                      <p className="font-semibold">{letter.signature}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Supporting Documents */}
              {selectedSubmission.letterData.attachments && selectedSubmission.letterData.attachments.length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">
                    Supporting Documents ({selectedSubmission.letterData.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedSubmission.letterData.attachments.map((attachment: Attachment, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <svg className="w-4 h-4 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            onClick={() => handleViewAttachment(attachment)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                            title="Preview in new tab"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                            title="Download file"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-3">
                    ⚠️ Review these documents carefully before approving. These will be attached to the email sent to the debtor.
                  </p>
                </div>
              )}

              {/* Show action buttons only for pending submissions */}
              {selectedSubmission.status === 'pending' ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedSubmission.id)}
                    disabled={processingId === selectedSubmission.id}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Approve & Send
                  </button>
                  <button
                    onClick={() => handleReject(selectedSubmission)}
                    disabled={processingId === selectedSubmission.id}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-md p-4 text-center">
                  <p className="text-sm text-gray-600">
                    {selectedSubmission.status === 'approved' && (
                      <>
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mb-2">
                          ✓ APPROVED
                        </span>
                        <br />
                        This letter has been sent. Deadline: {' '}
                        <strong>
                          {selectedSubmission.letterData.paymentDate
                            ? format(new Date(selectedSubmission.letterData.paymentDate), 'MMM d, yyyy')
                            : 'Not specified'
                          }
                        </strong>
                        <br />
                        <span className="text-xs">
                          Delivery: {selectedSubmission.letterData.deliveryMethod === 'email' ? 'Sent via Email' : 'Client Self-Delivery'}
                        </span>
                      </>
                    )}
                    {selectedSubmission.status === 'rejected' && (
                      <>
                        <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold mb-2">
                          ✗ REJECTED
                        </span>
                        <br />
                        This submission was rejected and the client was notified.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal with Live Preview */}
      {editingSubmission && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Edit Submission</h3>
                  <p className="text-sm text-gray-500 mt-1">Changes update the preview in real-time</p>
                </div>
                <button
                  onClick={() => {
                    setEditingSubmission(null);
                    setEditFormData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left: Edit Form */}
              <div className="overflow-y-auto p-6 border-r bg-gray-50">
                <h4 className="text-lg font-semibold mb-4 text-gray-900">Edit Fields</h4>
                <div className="space-y-4">
                  {/* Client Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={editFormData.client.clientName}
                      onChange={(e) => handleEditChange('client.clientName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Client Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={editFormData.client.clientEmail}
                      onChange={(e) => handleEditChange('client.clientEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Debtor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Debtor Name</label>
                    <input
                      type="text"
                      value={editFormData.debtorName}
                      onChange={(e) => handleEditChange('debtorName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Debtor Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Debtor Email</label>
                    <input
                      type="email"
                      value={editFormData.debtorEmail}
                      onChange={(e) => handleEditChange('debtorEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Debtor Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Debtor Address</label>
                    <input
                      type="text"
                      value={editFormData.debtorAddress}
                      onChange={(e) => handleEditChange('debtorAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Amount Owed */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Owed (£)</label>
                    <input
                      type="number"
                      value={editFormData.amountOwed}
                      onChange={(e) => handleEditChange('amountOwed', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      value={editFormData.paymentDate}
                      onChange={(e) => handleEditChange('paymentDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Claim Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claim Description</label>
                    <textarea
                      value={editFormData.claimDescription}
                      onChange={(e) => handleEditChange('claimDescription', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Letter Tone</label>
                    <select
                      value={editFormData.tone}
                      onChange={(e) => handleEditChange('tone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="friendly">Friendly Reminder</option>
                      <option value="professional">Professional</option>
                      <option value="assertive">Assertive</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </div>

                  {/* Direct Letter Text Editing */}
                  <div className="border-t pt-4 mt-6">
                    <h5 className="font-semibold text-gray-900 mb-3">Direct Letter Text Editing</h5>
                    <p className="text-xs text-gray-600 mb-4">Edit the letter content directly. Changes override the template.</p>

                    {(() => {
                      const letter = generateLetter(editFormData);
                      return (
                        <>
                          {/* Greeting */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Greeting</label>
                            <input
                              type="text"
                              value={editFormData.customGreeting || letter.greeting}
                              onChange={(e) => handleEditChange('customGreeting', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={letter.greeting}
                            />
                          </div>

                          {/* Opening */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Opening Paragraph</label>
                            <textarea
                              value={editFormData.customOpening || letter.opening}
                              onChange={(e) => handleEditChange('customOpening', e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={letter.opening}
                            />
                          </div>

                          {/* Body */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Body Paragraph</label>
                            <textarea
                              value={editFormData.customBody || letter.body}
                              onChange={(e) => handleEditChange('customBody', e.target.value)}
                              rows={6}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={letter.body}
                            />
                          </div>

                          {/* Closing */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Closing</label>
                            <input
                              type="text"
                              value={editFormData.customClosing || letter.closing}
                              onChange={(e) => handleEditChange('customClosing', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={letter.closing}
                            />
                          </div>

                          {/* Signature */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Signature Name</label>
                            <input
                              type="text"
                              value={editFormData.customSignature || letter.signature}
                              onChange={(e) => handleEditChange('customSignature', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={letter.signature}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right: Live Letter Preview */}
              <div className="overflow-y-auto p-6 bg-white">
                <h4 className="text-lg font-semibold mb-4 text-gray-900">Live Preview</h4>
                <div className="border rounded-lg p-8 bg-gray-50 font-serif text-sm">
                  {(() => {
                    const letter = generateLetter(editFormData);
                    return (
                      <div className="space-y-4">
                        {/* Logo */}
                        <div className="mb-6">
                          {editFormData.logo ? (
                            <img src={editFormData.logo} alt="Company Logo" className="h-16 w-auto mb-2" />
                          ) : (
                            <>
                              <div className="text-xl font-bold text-blue-600">SMART SETTLE GO</div>
                              <div className="text-xs text-gray-600">Professional Debt Recovery Services</div>
                            </>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-right text-xs mb-6">
                          {format(new Date(), 'do MMMM yyyy')}
                        </div>

                        {/* Letter Content */}
                        <p className="font-semibold">{editFormData.customGreeting || letter.greeting}</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{editFormData.customOpening || letter.opening}</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{editFormData.customBody || letter.body}</p>
                        <p className="mt-6">{editFormData.customClosing || letter.closing}</p>

                        {/* Signature */}
                        {editFormData.signature ? (
                          <div className="mt-4">
                            <img src={editFormData.signature} alt="Signature" className="h-12 w-auto mb-1" />
                            <p className="font-semibold">{editFormData.customSignature || letter.signature}</p>
                          </div>
                        ) : (
                          <p className="font-semibold mt-4">{editFormData.customSignature || letter.signature}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingSubmission(null);
                    setEditFormData(null);
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={processingId === editingSubmission.id}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {processingId === editingSubmission.id ? 'Saving Changes...' : 'Save Changes & Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Reject Submission</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {rejectingSubmission.letterData.client.clientName} → {rejectingSubmission.letterData.debtorName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setRejectingSubmission(null);
                    setRejectionMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (will be sent to client via email) *
                </label>
                <textarea
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  rows={6}
                  placeholder="Example: Unfortunately, we cannot process your demand letter at this time because the claim description contains inappropriate language. Please revise and resubmit with a professional description of your claim."
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  This message will be sent to: {rejectingSubmission.letterData.client.clientEmail}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Client will be notified</p>
                    <p>The client will receive an email explaining why their submission was rejected. They will NOT receive a refund automatically - you'll need to process that separately in Stripe if applicable.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectingSubmission(null);
                    setRejectionMessage('');
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={processingId === rejectingSubmission.id || !rejectionMessage.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {processingId === rejectingSubmission.id ? 'Rejecting...' : 'Reject & Notify Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Update Modal */}
      {trackingSubmission && trackingFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Update Tracking Status</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {trackingSubmission.letterData.client.clientName} → {trackingSubmission.letterData.debtorName}
                    {' '}(£{trackingSubmission.letterData.amountOwed})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTrackingSubmission(null);
                    setTrackingFormData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Payment Status Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Status
                      </label>
                      <select
                        value={trackingFormData.paymentStatus}
                        onChange={(e) => setTrackingFormData({...trackingFormData, paymentStatus: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid in Full</option>
                        <option value="partial">Partial Payment</option>
                        <option value="dispute">Dispute</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Received Date
                      </label>
                      <input
                        type="date"
                        value={trackingFormData.paymentReceivedDate}
                        onChange={(e) => setTrackingFormData({...trackingFormData, paymentReceivedDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Amount (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={trackingFormData.paymentAmount}
                        onChange={(e) => setTrackingFormData({...trackingFormData, paymentAmount: e.target.value})}
                        placeholder="Amount received"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Notes
                      </label>
                      <textarea
                        value={trackingFormData.paymentNotes}
                        onChange={(e) => setTrackingFormData({...trackingFormData, paymentNotes: e.target.value})}
                        rows={2}
                        placeholder="E.g., Bank transfer reference, installment plan details..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Debtor Response Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Debtor Response</h4>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={trackingFormData.debtorResponded}
                        onChange={(e) => setTrackingFormData({...trackingFormData, debtorResponded: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm font-medium text-gray-700">
                        Debtor has responded
                      </label>
                    </div>

                    {trackingFormData.debtorResponded && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Response Date
                          </label>
                          <input
                            type="date"
                            value={trackingFormData.debtorResponseDate}
                            onChange={(e) => setTrackingFormData({...trackingFormData, debtorResponseDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Response Details
                          </label>
                          <textarea
                            value={trackingFormData.debtorResponseNotes}
                            onChange={(e) => setTrackingFormData({...trackingFormData, debtorResponseNotes: e.target.value})}
                            rows={3}
                            placeholder="Summary of debtor's response..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Case Closure Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Case Closure</h4>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={trackingFormData.caseClosed}
                        onChange={(e) => setTrackingFormData({...trackingFormData, caseClosed: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm font-medium text-gray-700">
                        Close this case
                      </label>
                    </div>

                    {trackingFormData.caseClosed && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Closure Date
                            </label>
                            <input
                              type="date"
                              value={trackingFormData.caseClosedDate}
                              onChange={(e) => setTrackingFormData({...trackingFormData, caseClosedDate: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Closure Reason
                            </label>
                            <select
                              value={trackingFormData.caseClosureReason}
                              onChange={(e) => setTrackingFormData({...trackingFormData, caseClosureReason: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select reason...</option>
                              <option value="paid_full">Paid in Full</option>
                              <option value="paid_partial">Partial Payment Accepted</option>
                              <option value="no_response">No Response from Debtor</option>
                              <option value="dispute">Dispute - Legal Action Required</option>
                              <option value="withdrawn">Client Withdrew Claim</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Final Notes
                          </label>
                          <textarea
                            value={trackingFormData.caseNotes}
                            onChange={(e) => setTrackingFormData({...trackingFormData, caseNotes: e.target.value})}
                            rows={3}
                            placeholder="Final case summary and outcome..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setTrackingSubmission(null);
                    setTrackingFormData(null);
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTracking}
                  disabled={processingId === trackingSubmission.id}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {processingId === trackingSubmission.id ? 'Saving...' : 'Save Tracking Updates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
