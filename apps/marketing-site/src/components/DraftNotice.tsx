import { AlertTriangle } from "lucide-react";

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
    <p className="mb-8 flex items-start gap-3 rounded-xl2 border border-accent-200 bg-accent-50 px-4 py-3 text-sm leading-relaxed text-accent-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" aria-hidden="true" />
      <span>
        Draft — pending legal review. This {documentLabel} describes our current
        intentions and is not yet a final, legally-reviewed document.
      </span>
    </p>
  );
}
