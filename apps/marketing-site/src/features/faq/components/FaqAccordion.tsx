"use client";

import { useState } from "react";

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
    <section style={{ padding: "48px 24px", maxWidth: 640 }}>
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 0" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", fontWeight: 600, cursor: "pointer" }}
            >
              {item.question}
            </button>
            {isOpen && <p>{item.answer}</p>}
          </div>
        );
      })}
    </section>
  );
}
