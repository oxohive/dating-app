import { sortAuditLogNewestFirst } from "./sortAuditLogNewestFirst";
import { AuditLogEntry } from "@/features/audit/api/audit.api";

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: "audit-1",
    action: "refund_payment",
    targetType: "payment",
    targetId: "pay-1",
    adminUserId: "admin-1",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("sortAuditLogNewestFirst", () => {
  it("orders entries from most recent createdAt to least recent", () => {
    const oldest = makeEntry({ id: "audit-1", createdAt: "2026-01-01T00:00:00Z" });
    const newest = makeEntry({ id: "audit-2", createdAt: "2026-01-03T00:00:00Z" });
    const middle = makeEntry({ id: "audit-3", createdAt: "2026-01-02T00:00:00Z" });

    const result = sortAuditLogNewestFirst([oldest, newest, middle]);

    expect(result.map((entry) => entry.id)).toEqual(["audit-2", "audit-3", "audit-1"]);
  });

  it("does not mutate the input array", () => {
    const oldest = makeEntry({ id: "audit-1", createdAt: "2026-01-01T00:00:00Z" });
    const newest = makeEntry({ id: "audit-2", createdAt: "2026-01-03T00:00:00Z" });
    const input = [oldest, newest];

    sortAuditLogNewestFirst(input);

    expect(input).toEqual([oldest, newest]);
  });

  it("returns an empty array for an empty list", () => {
    expect(sortAuditLogNewestFirst([])).toEqual([]);
  });
});
