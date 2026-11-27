"use client";

import { Check, ImageOff, X } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Table } from "@/components/Table";
import { Verification } from "@/features/verification/api/verification.api";

export interface VerificationQueueProps {
  verifications: Verification[];
  onApprove: (verificationId: string) => void;
  onReject: (verificationId: string) => void;
}

const STATUS_TONE: Record<Verification["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

/**
 * Review queue table: profile info plus the submitted selfie (rendered via
 * its resolved URL - never a raw S3 key). Pending submissions get
 * approve/reject actions; already-reviewed submissions show who reviewed
 * them and when instead (review history), per the W2 brief.
 */
export function VerificationQueue({ verifications, onApprove, onReject }: VerificationQueueProps) {
  return (
    <Table<Verification>
      rows={verifications}
      getRowKey={(verification) => verification.id}
      emptyMessage="No verification submissions match this filter."
      columns={[
        {
          key: "profile",
          header: "Profile",
          render: (verification) => (
            <span className="font-medium text-slate-800">{verification.profileDisplayName}</span>
          ),
        },
        {
          key: "selfie",
          header: "Selfie",
          render: (verification) =>
            verification.selfieUrl ? (
              // Selfie URLs are arbitrary resolved S3/CDN URLs from the backend, not a
              // known local image domain to configure next/image for.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={verification.selfieUrl}
                alt={`Selfie submitted by ${verification.profileDisplayName}`}
                className="h-16 w-16 rounded-md object-cover ring-1 ring-slate-200"
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <ImageOff size={14} />
                No selfie
              </span>
            ),
        },
        {
          key: "status",
          header: "Status",
          render: (verification) => <Badge tone={STATUS_TONE[verification.status]}>{verification.status}</Badge>,
        },
        {
          key: "review",
          header: "Review history",
          render: (verification) =>
            verification.status === "pending" ? (
              <span className="text-slate-400">Not yet reviewed</span>
            ) : (
              <span className="text-slate-500">
                {verification.reviewedByUserId ?? "unknown reviewer"}
                {" - "}
                {verification.reviewedAt ? new Date(verification.reviewedAt).toLocaleString() : "unknown time"}
              </span>
            ),
        },
        {
          key: "actions",
          header: "Action",
          render: (verification) =>
            verification.status === "pending" ? (
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => onApprove(verification.id)}>
                  <Check size={14} />
                  Approve
                </Button>
                <Button variant="danger" onClick={() => onReject(verification.id)}>
                  <X size={14} />
                  Reject
                </Button>
              </div>
            ) : null,
        },
      ]}
    />
  );
}
