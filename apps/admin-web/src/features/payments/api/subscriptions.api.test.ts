import { buildSubscriptionsQuery, mapSubscription } from "./subscriptions.api";

describe("buildSubscriptionsQuery", () => {
  it("omits the status query param for 'all'", () => {
    expect(buildSubscriptionsQuery("all")).toBe("/admin/subscriptions");
  });

  it("adds a status query param for a specific status", () => {
    expect(buildSubscriptionsQuery("active")).toBe("/admin/subscriptions?status=active");
    expect(buildSubscriptionsQuery("expired")).toBe("/admin/subscriptions?status=expired");
    expect(buildSubscriptionsQuery("cancelled")).toBe("/admin/subscriptions?status=cancelled");
  });
});

describe("mapSubscription", () => {
  it("maps every field from the raw admin API model", () => {
    const mapped = mapSubscription({
      id: "sub-1",
      user_id: "user-1",
      plan: "monthly",
      status: "active",
      started_at: "2026-01-01T00:00:00Z",
      expires_at: "2026-02-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(mapped).toEqual({
      id: "sub-1",
      userId: "user-1",
      plan: "monthly",
      status: "active",
      startedAt: "2026-01-01T00:00:00Z",
      expiresAt: "2026-02-01T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });
});
