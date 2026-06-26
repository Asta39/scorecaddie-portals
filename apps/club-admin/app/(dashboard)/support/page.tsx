'use client'

import { Mail, MessageCircle, BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    q: 'How do I register a new caddie?',
    a: 'Click the "Register Caddie" button at the top of the sidebar, or navigate to Caddie Profiles and click "Register Caddie" in the top-right corner. Fill in the caddie\'s name, phone number, experience level, and optionally upload a photo.',
  },
  {
    q: 'How do I mark caddie attendance for today?',
    a: 'Go to the Weekly Roster page. You can mark a caddie as present or absent from the roster view. Attendance is tracked per-day and used for analytics.',
  },
  {
    q: 'How do I record a caddie payment?',
    a: 'Navigate to the Payments page. Select the caddie and enter the payment amount and period. Payments extend the caddie\'s active subscription on the marketplace app.',
  },
  {
    q: 'How do I import multiple caddies at once?',
    a: 'On the Caddie Profiles page, click "Import CSV". Download the template CSV, fill it in with caddie details, then upload it. The system will validate and skip duplicates automatically.',
  },
  {
    q: 'A caddie is showing as "Expired" — what does that mean?',
    a: 'It means the caddie\'s subscription payment has lapsed or was never recorded. Go to the Payments page, find the caddie, and record a payment to reactivate their marketplace visibility.',
  },
  {
    q: 'How do I update the club\'s caddie description on the app?',
    a: 'Go to Settings → Marketplace Bio. Update the description text and click "Save Template". This text appears on the mobile app for all caddies registered at your club.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'On the login page, click "Forgot password?" and enter your email. You will receive a reset link. You can also change your password from Settings → Account Security once logged in.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-sm text-foreground hover:bg-muted/40 transition-colors"
      >
        <span>{q}</span>
        {open ? (
          <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
          {a}
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  return (
    <div className="portal-content">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Help &amp; Support</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Frequently asked questions and ways to get in touch
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>

        {/* Contact cards */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground mb-4">Get in Touch</h2>

          <div className="card p-5 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 flex-shrink-0">
              <Mail size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Email Support</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Send us an email and we&apos;ll get back to you within 24 hours.
              </p>
              <a
                href="mailto:support@scorecaddie.com"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                support@scorecaddie.com <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="card p-5 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
              <MessageCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">WhatsApp Support</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Chat with our team directly on WhatsApp for faster assistance.
              </p>
              <a
                href="https://wa.me/254700000000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Open WhatsApp <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="card p-5 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Documentation</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Read the full admin guide and tutorials.
              </p>
              <a
                href="https://docs.scorecaddie.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                docs.scorecaddie.com <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
