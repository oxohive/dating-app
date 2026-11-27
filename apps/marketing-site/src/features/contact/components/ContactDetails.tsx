"use client";

import { useState } from "react";
import { Mail, CheckCircle2, Send } from "lucide-react";

const SUPPORT_EMAIL = "support@datingapp.example";

/**
 * Contact information and a visually-complete contact form.
 *
 * There is no backend submission endpoint for this form yet, so submitting
 * it does not send anything anywhere — it just shows a confirmation note
 * pointing people at the direct support email instead.
 */
export function ContactDetails() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="mx-auto max-w-xl px-6 py-16 sm:py-20">
      <div className="mb-8 flex gap-4 rounded-xl2 border border-neutral-200 bg-white p-6 shadow-card">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-neutral-900">
            Email us directly
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            For support, safety reports, or anything else, email us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary-600 underline-offset-2 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            . We&apos;re a small Chennai-pilot team, so replies may take a
            little while, but safety reports are always prioritised.
          </p>
        </div>
      </div>

      <div className="rounded-xl2 border border-neutral-200 bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Or send a message</h2>

        {submitted ? (
          <p className="mt-4 flex items-start gap-3 rounded-xl2 bg-green-50 p-4 text-sm leading-relaxed text-green-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
            <span>
              Thanks — this form isn&apos;t wired up to send messages yet. Please
              email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline-offset-2 hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              and we&apos;ll get back to you there.
            </span>
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
            className="mt-5 flex flex-col gap-4"
          >
            <label className="block text-sm font-medium text-neutral-700">
              Name
              <input
                type="text"
                name="name"
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Email
              <input
                type="email"
                name="email"
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-700">
              Message
              <textarea
                name="message"
                rows={4}
                className="mt-1.5 block w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </label>
            <div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-primary-600 hover:shadow-lg hover:-translate-y-0.5"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
