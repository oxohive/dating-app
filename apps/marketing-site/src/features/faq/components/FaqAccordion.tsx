"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { question: "Is the app free?", answer: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
  { question: "How do I get verified?", answer: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
  { question: "Is my data safe?", answer: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris." },
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
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-neutral-900 transition-colors hover:text-primary-600"
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
