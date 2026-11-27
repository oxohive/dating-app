export interface DraftNoticeProps {
  /** What kind of document this notice is attached to, e.g. "policy". */
  documentLabel?: string;
}

/**
 * Small, honest disclaimer shown on placeholder legal/policy pages that
 * have not yet been through formal legal review.
 */
export function DraftNotice({ documentLabel = "document" }: DraftNoticeProps) {
  return (
    <p
      style={{
        background: "#fef3c7",
        color: "#92400e",
        padding: "10px 16px",
        borderRadius: 6,
        fontSize: 14,
        marginBottom: 24,
      }}
    >
      Draft — pending legal review. This {documentLabel} describes our current
      intentions and is not yet a final, legally-reviewed document.
    </p>
  );
}
