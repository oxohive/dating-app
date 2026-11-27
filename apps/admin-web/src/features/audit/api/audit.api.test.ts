import { mapAuditLogEntry } from "./audit.api";

describe("mapAuditLogEntry", () => {
  it("maps every snake_case field to its camelCase equivalent", () => {
    const mapped = mapAuditLogEntry({
      id: "audit-1",
      action: "refund_payment",
      target_type: "payment",
      target_id: "pay-1",
      admin_user_id: "admin-1",
      created_at: "2026-01-02T00:00:00Z",
    });

    expect(mapped).toEqual({
      id: "audit-1",
      action: "refund_payment",
      targetType: "payment",
      targetId: "pay-1",
      adminUserId: "admin-1",
      createdAt: "2026-01-02T00:00:00Z",
    });
  });
});
