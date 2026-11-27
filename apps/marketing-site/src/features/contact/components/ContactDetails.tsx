"use client";

import { useState } from "react";

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
    <section style={{ padding: "48px 24px", maxWidth: 560 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Email us directly</h2>
        <p style={{ color: "#374151" }}>
          For support, safety reports, or anything else, email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We&apos;re a
          small Chennai-pilot team, so replies may take a little while, but
          safety reports are always prioritised.
        </p>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 8 }}>Or send a message</h2>
      {submitted ? (
        <p style={{ color: "#166534" }}>
          Thanks — this form isn&apos;t wired up to send messages yet. Please
          email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and
          we&apos;ll get back to you there.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label>
            Name
            <input type="text" name="name" style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
          </label>
          <label>
            Email
            <input type="email" name="email" style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
          </label>
          <label>
            Message
            <textarea name="message" rows={4} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
          </label>
          <div>
            <button
              type="submit"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                background: "#db2777",
                color: "#fff",
              }}
            >
              Send
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
