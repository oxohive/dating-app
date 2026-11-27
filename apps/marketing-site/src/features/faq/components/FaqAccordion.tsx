"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is the app free?",
    answer:
      "Yes. The Free plan gives you basic matching and 5 likes a day at no cost. " +
      "Plus and Premium add unlimited likes and extra discovery features if you want more.",
  },
  {
    question: "How do I get verified?",
    answer:
      "During onboarding, you'll take a quick selfie that we match against your profile " +
      "photos. It's a one-time check, and it's how we keep profiles real across the app.",
  },
  {
    question: "Is my data safe?",
    answer:
      "We don't sell your personal data, and your precise location is never shown to " +
      "other users. See our Privacy Policy for the full details on what we collect and why.",
  },
];

/**
 * Simple expand/collapse FAQ accordion for the FAQ page.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.question}
              className="overflow-hidden rounded-xl2 border border-neutral-200 bg-white shadow-card transition-shadow hover:shadow-soft"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-neutral-900 transition-colors hover:text-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400"
                aria-expanded={isOpen}
              >
                {item.question}
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-primary-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <p className="px-6 pb-5 text-sm leading-relaxed text-neutral-600">{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
