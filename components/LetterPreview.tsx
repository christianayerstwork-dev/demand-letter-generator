'use client';

import { LetterContent } from '@/types';
import { format } from 'date-fns';

interface LetterPreviewProps {
  content: LetterContent | null;
}

export default function LetterPreview({ content }: LetterPreviewProps) {
  if (!content) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200 min-h-[600px] flex items-center justify-center">
        <p className="text-gray-400 text-center">
          Fill in the form to preview your letter
        </p>
      </div>
    );
  }

  const today = format(new Date(), 'do MMMM yyyy');

  return (
    <div
      className="bg-white p-12 rounded-lg shadow-lg border-2 border-gray-200 font-serif relative select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click
      onCopy={(e) => e.preventDefault()} // Disable copy
    >
      {/* Watermark overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(59, 130, 246, 0.03) 100px, rgba(59, 130, 246, 0.03) 200px)'
        }}
      >
        <div
          className="text-6xl font-bold text-blue-500 opacity-10 rotate-[-45deg] select-none"
          style={{ userSelect: 'none' }}
        >
          PREVIEW ONLY
        </div>
      </div>

      {/* Content wrapper */}
      <div className="relative z-0">
        {/* Logo placeholder */}
        <div className="mb-8">
          <div className="text-2xl font-bold text-blue-600">SMART SETTLE GO</div>
          <div className="text-sm text-gray-600">Professional Debt Recovery Services</div>
        </div>

        {/* Date */}
        <div className="mb-8 text-right text-sm">
          {today}
        </div>

        {/* Letter content */}
        <div className="space-y-4 text-sm leading-relaxed">
          <div className="font-semibold">{content.greeting}</div>

          <div className="whitespace-pre-line">
            {content.opening}
          </div>

          <div className="whitespace-pre-line">
            {content.body}
          </div>

          <div className="mt-8">
            {content.closing}
          </div>

          <div className="font-semibold mt-4">
            {content.signature}
          </div>
        </div>
      </div>

      {/* Preview badge */}
      <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
        PREVIEW
      </div>
    </div>
  );
}
