export interface Report {
  id: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
}

/**
 * TODO: wire up to backend endpoint GET /api/admin/reports?status=open
 * (see services/backend). Returns placeholder data for the MVP skeleton.
 */
export async function listReports(): Promise<Report[]> {
  return Promise.resolve([
    {
      id: "r_1",
      reportedUserId: "u_2",
      reportedUserName: "Ravi Shankar",
      reason: "Inappropriate photos",
      status: "open",
      createdAt: "2026-11-20T10:00:00Z",
    },
    {
      id: "r_2",
      reportedUserId: "u_1",
      reportedUserName: "Asha Kumar",
      reason: "Spam messages",
      status: "open",
      createdAt: "2026-11-22T09:30:00Z",
    },
  ]);
}

/**
 * TODO: wire up to backend endpoint POST /api/admin/reports/:id/resolve
 * (see services/backend). Stubbed for the MVP skeleton.
 */
export async function resolveReport(_reportId: string): Promise<void> {
  return Promise.resolve();
}
