'use client';

import { useState, useEffect } from 'react';
import { LetterData, LetterContent, ToneType, RelationshipType, Attachment, DeliveryMethod } from '@/types';
import { generateLetter } from '@/lib/letterTemplate';
import { validateClaimDescription, sanitizeText, EXAMPLE_DESCRIPTIONS } from '@/lib/contentValidation';
import LetterPreview from '@/components/LetterPreview';
import { format, addDays } from 'date-fns';

export default function Home() {
  const [formData, setFormData] = useState<LetterData>({
    client: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      relationshipToDebtor: 'landlord' as RelationshipType,
      relationshipOther: '',
      bankName: '',
      accountNumber: '',
      sortCode: ''
    },
    debtorName: '',
    debtorAddress: '',
    debtorEmail: '',
    amountOwed: '',
    paymentDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    claimDescription: '',
    tone: 'friendly' as ToneType,
    deliveryMethod: 'email' as DeliveryMethod,
    attachments: []
  });

  const [letterContent, setLetterContent] = useState<LetterContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [claimValidation, setClaimValidation] = useState<ReturnType<typeof validateClaimDescription> | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showValidation, setShowValidation] = useState(false); // Track if we should show validation errors

  // Calculate form completion percentage
  const calculateProgress = (): number => {
    const requiredFields = [
      formData.client.clientName,
      formData.client.clientEmail,
      formData.debtorName,
      formData.debtorAddress,
      formData.deliveryMethod === 'email' ? formData.debtorEmail : 'not-required',
      formData.amountOwed,
      formData.paymentDate,
      formData.claimDescription,
    ];

    const filledFields = requiredFields.filter(field => field && field.toString().trim().length > 0).length;
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  // Helper to get input class with validation
  const getInputClass = (value: string, baseClass: string = "w-full px-4 py-2 border rounded-md focus:ring-2 focus:border-transparent") => {
    const isEmpty = !value || value.trim().length === 0;
    if (showValidation && isEmpty) {
      return `${baseClass} border-red-500 focus:ring-red-500 bg-red-50`;
    }
    return `${baseClass} border-gray-300 focus:ring-blue-500`;
  };

  // Update letter preview when form changes
  useEffect(() => {
    // Check that required fields have actual content (not just whitespace)
    const hasClientName = formData.client.clientName.trim().length > 0;
    const hasDebtorName = formData.debtorName.trim().length > 0;
    const hasAmount = formData.amountOwed.trim().length > 0;
    const hasClaimDescription = formData.claimDescription.trim().length > 0;

    if (hasClientName && hasDebtorName && hasAmount && hasClaimDescription) {
      const content = generateLetter(formData);
      setLetterContent(content);
    } else {
      setLetterContent(null);
    }
  }, [formData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Sanitize claim description
    const processedValue = name === 'claimDescription' ? sanitizeText(value) : value;

    // Validate claim description
    if (name === 'claimDescription') {
      const validation = validateClaimDescription(processedValue);
      setClaimValidation(validation);
    }

    // Handle nested client fields
    if (name.startsWith('client.')) {
      const clientField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        client: {
          ...prev.client,
          [clientField]: processedValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
  };

  const applySuggestion = () => {
    if (claimValidation?.suggestion) {
      setFormData(prev => ({
        ...prev,
        claimDescription: claimValidation.suggestion!
      }));
      // Revalidate
      const validation = validateClaimDescription(claimValidation.suggestion);
      setClaimValidation(validation);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);

    try {
      const newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (max 5MB per file)
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
          continue;
        }

        // Validate file type (allow common document types)
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!allowedTypes.includes(file.type)) {
          alert(`File "${file.name}" type not supported. Please upload PDF, images, Word, or Excel files.`);
          continue;
        }

        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
          fileSize: file.size
        });
      }

      if (newAttachments.length > 0) {
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...newAttachments]
        }));
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all required fields are filled
    const requiredFieldsCheck = [
      { value: formData.client.clientName, name: 'Your Name' },
      { value: formData.client.clientEmail, name: 'Your Email' },
      { value: formData.debtorName, name: 'Debtor Name' },
      { value: formData.debtorAddress, name: 'Debtor Address' },
      { value: formData.deliveryMethod === 'email' ? formData.debtorEmail : 'ok', name: 'Debtor Email' },
      { value: formData.amountOwed, name: 'Amount Owed' },
      { value: formData.claimDescription, name: 'Claim Description' },
    ];

    const missingFields = requiredFieldsCheck.filter(field => !field.value || field.value.trim().length === 0);

    if (missingFields.length > 0) {
      setShowValidation(true);
      const fieldNames = missingFields.map(f => f.name).join(', ');
      alert(`Please fill in the following required fields: ${fieldNames}`);
      // Scroll to top to see highlighted fields
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      // FOR TESTING: Bypass Stripe and directly create submission
      // In production, this would go through Stripe checkout first
      const response = await fetch('/api/test-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      const result = await response.json();

      // Redirect to success page with submission ID
      window.location.href = `/success?id=${result.submissionId}`;
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="inline-block">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">
              SMART SETTLE GO
            </h1>
            <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full mb-3"></div>
          </div>
          <p className="text-xl text-gray-700 font-medium">
            Professional Debt Recovery Services
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Generate legally-formatted demand letters with confidence
          </p>
          <a
            href="/admin"
            className="absolute top-0 right-0 text-sm text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Admin Dashboard
          </a>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Letter Details
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Progress:</span>
                  <span className={`text-lg font-bold ${calculateProgress() === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                    {calculateProgress()}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Fill in the information below to generate your demand letter
              </p>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    calculateProgress() === 100 ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Details Section */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h3>

                {/* Client Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="client.clientName"
                    value={formData.client.clientName}
                    onChange={handleInputChange}
                    required
                    className={getInputClass(formData.client.clientName)}
                    placeholder="Jane Doe"
                  />
                </div>

                {/* Client Email */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    name="client.clientEmail"
                    value={formData.client.clientEmail}
                    onChange={handleInputChange}
                    required
                    className={getInputClass(formData.client.clientEmail)}
                    placeholder="jane@example.com"
                  />
                </div>

                {/* Client Phone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    name="client.clientPhone"
                    value={formData.client.clientPhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+44 7123 456789"
                  />
                </div>

                {/* Bank Details Section */}
                <div className="mb-4 pb-4 border-b">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    Payment Details (Optional)
                  </h4>
                  <p className="text-xs text-gray-600 mb-4">
                    Include your bank details so the debtor knows where to send payment. Leave blank if you prefer the debtor contact you directly.
                  </p>

                  {/* Bank Name */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="client.bankName"
                      value={formData.client.bankName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Barclays Bank"
                    />
                  </div>

                  {/* Sort Code */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort Code
                    </label>
                    <input
                      type="text"
                      name="client.sortCode"
                      value={formData.client.sortCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 12-34-56"
                      maxLength={8}
                    />
                  </div>

                  {/* Account Number */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="client.accountNumber"
                      value={formData.client.accountNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 12345678"
                      maxLength={8}
                    />
                  </div>
                </div>

                {/* Relationship to Debtor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Relationship to Debtor *
                  </label>
                  <select
                    name="client.relationshipToDebtor"
                    value={formData.client.relationshipToDebtor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="company">Company/Business</option>
                    <option value="guarantor">Guarantor</option>
                    <option value="individual">Individual/Personal</option>
                    <option value="landlord">Landlord</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Custom Relationship (shown if 'other' selected) */}
                {formData.client.relationshipToDebtor === 'other' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specify Relationship *
                    </label>
                    <input
                      type="text"
                      name="client.relationshipOther"
                      value={formData.client.relationshipOther}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., supplier, contractor, etc."
                    />
                  </div>
                )}
              </div>

              {/* Debtor Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Debtor Details</h3>

              {/* Debtor Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Debtor Name *
                </label>
                <input
                  type="text"
                  name="debtorName"
                  value={formData.debtorName}
                  onChange={handleInputChange}
                  required
                  className={getInputClass(formData.debtorName)}
                  placeholder="John Smith"
                />
              </div>

              {/* Debtor Address */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Debtor Address *
                </label>
                <input
                  type="text"
                  name="debtorAddress"
                  value={formData.debtorAddress}
                  onChange={handleInputChange}
                  required
                  className={getInputClass(formData.debtorAddress)}
                  placeholder="123 High Street, London, SW1A 1AA"
                />
              </div>

              {/* Debtor Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Debtor Email {formData.deliveryMethod === 'email' ? '*' : '(Optional)'}
                </label>
                <input
                  type="email"
                  name="debtorEmail"
                  value={formData.debtorEmail}
                  onChange={handleInputChange}
                  required={formData.deliveryMethod === 'email'}
                  className={formData.deliveryMethod === 'email' ? getInputClass(formData.debtorEmail) : "w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"}
                  placeholder="john.smith@example.com"
                />
              </div>

              {/* Delivery Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you like to deliver this letter? *
                </label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="email"
                      checked={formData.deliveryMethod === 'email'}
                      onChange={handleInputChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Smart Settle Go sends via email</div>
                      <div className="text-sm text-gray-600 mt-1">
                        We'll send the demand letter directly to the debtor's email address on your behalf. You'll receive a confirmation email.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="self"
                      checked={formData.deliveryMethod === 'self'}
                      onChange={handleInputChange}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">I'll deliver it myself</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Receive the PDF letter via email to print and deliver yourself (e.g., hand delivery, recorded post).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Amount Owed */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Outstanding (£) *
                </label>
                <input
                  type="number"
                  name="amountOwed"
                  value={formData.amountOwed}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className={getInputClass(formData.amountOwed)}
                  placeholder="1500.00"
                />
              </div>

              {/* Interest Option */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="includeInterest"
                    checked={formData.includeInterest || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, includeInterest: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include interest on overdue amount
                  </span>
                </label>
                {formData.includeInterest && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interest Rate (% per annum)
                    </label>
                    <input
                      type="number"
                      name="interestRate"
                      value={formData.interestRate || ''}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="8.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Common rates: Bank of England base rate + 8% (currently ~13%), or statutory interest rate
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Due Date *
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: 14 days from today
                </p>
              </div>

              {/* Claim Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What is the claim for? *
                </label>
                <textarea
                  name="claimDescription"
                  value={formData.claimDescription}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  maxLength={200}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:border-transparent ${
                    claimValidation?.hasWarnings || claimValidation?.errors.length
                      ? 'border-yellow-500 focus:ring-yellow-500'
                      : showValidation && (!formData.claimDescription || formData.claimDescription.trim().length === 0)
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="e.g., Unpaid rent for November 2024"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.claimDescription.length}/200 characters
                </p>

                {/* Validation Messages */}
                {claimValidation?.errors.map((error, i) => (
                  <div key={i} className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                ))}

                {claimValidation?.warnings.map((warning, i) => (
                  <div key={i} className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">{warning}</p>
                  </div>
                ))}

                {/* Professional Suggestion */}
                {claimValidation?.suggestion && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Professional version:</strong> {claimValidation.suggestion}
                    </p>
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      Use This Instead
                    </button>
                  </div>
                )}

                {/* Admin Review Flag */}
                {claimValidation?.requiresAdminReview && (
                  <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-800">
                      ⚠️ This submission will be flagged for admin review before sending.
                    </p>
                  </div>
                )}

                {/* Examples */}
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                    See examples of well-formatted descriptions
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-gray-600 list-disc list-inside">
                    {EXAMPLE_DESCRIPTIONS.map((example, i) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </details>
              </div>

              {/* Tone Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Letter Tone *
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="friendly">Friendly Reminder</option>
                  <option value="professional">Professional</option>
                  <option value="assertive">Assertive</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>

              {/* Logo Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Upload your company logo to appear on the letterhead (PNG, JPG, max 5MB)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        alert('Logo file must be less than 5MB');
                        return;
                      }
                      const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      setFormData(prev => ({ ...prev, logo: base64 }));
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    Choose Logo
                  </label>
                  {formData.logo && (
                    <div className="flex items-center gap-2">
                      <img src={formData.logo} alt="Logo preview" className="h-10 w-auto border rounded" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logo: undefined }))}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Upload a signature image to personalize your letter (PNG with transparent background recommended, max 2MB)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="signature-upload"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert('Signature file must be less than 2MB');
                        return;
                      }
                      const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      setFormData(prev => ({ ...prev, signature: base64 }));
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="signature-upload"
                    className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    Choose Signature
                  </label>
                  {formData.signature && (
                    <div className="flex items-center gap-2">
                      <img src={formData.signature} alt="Signature preview" className="h-12 w-auto border rounded bg-white p-1" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, signature: undefined }))}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Supporting Documents */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents (Optional)
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Attach invoices, contracts, emails, or other evidence to strengthen your claim. These will be included when the letter is sent.
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileUpload}
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      {uploadingFile ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, Images, Word, Excel (max 5MB per file)
                    </span>
                  </label>
                </div>

                {/* Attached Files List */}
                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Attached Files ({formData.attachments.length}):
                    </p>
                    {formData.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{attachment.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="ml-2 text-red-600 hover:text-red-800 p-1"
                          title="Remove file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div> {/* End Debtor Details Section */}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                {/* Preview Toggle (Mobile) */}
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium lg:hidden"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!letterContent}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit for Review (Test Mode - No Payment)
                </button>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                  <p className="text-xs text-amber-900 text-center">
                    <strong>⚠️ TEST MODE:</strong> Payment is currently disabled for testing.<br/>
                    <strong>How it works:</strong><br/>
                    1. Review your letter preview above<br/>
                    2. Submit (skips payment in test mode)<br/>
                    3. Admin reviews and approves your letter<br/>
                    4. Receive the final PDF via email<br/>
                    <em className="text-xs text-amber-700 mt-2 block">(In production: payment required before submission)</em>
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className={`${showPreview ? 'block' : 'hidden'} lg:block`}>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Letter Preview
            </h2>
            <LetterPreview content={letterContent} />
          </div>
        </div>
      </div>
    </main>
  );
}
