import { buildVerificationsQuery, mapVerification } from "./verification.api";

describe("buildVerificationsQuery", () => {
  it("omits the status query param for 'all'", () => {
    expect(buildVerificationsQuery("all")).toBe("/admin/verifications");
  });

  it("adds a status query param for a specific status", () => {
    expect(buildVerificationsQuery("pending")).toBe("/admin/verifications?status=pending");
    expect(buildVerificationsQuery("approved")).toBe("/admin/verifications?status=approved");
    expect(buildVerificationsQuery("rejected")).toBe("/admin/verifications?status=rejected");
  });
});

describe("mapVerification", () => {
  it("maps the raw display_name field to profileDisplayName", () => {
    const mapped = mapVerification({
      id: "v1",
      profile_id: "profile-123",
      display_name: "Asha Kumar",
      status: "pending",
      selfie_url: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(mapped.profileDisplayName).toBe("Asha Kumar");
    expect(mapped.selfieUrl).toBeNull();
  });

  it("maps every field when fully populated", () => {
    const mapped = mapVerification({
      id: "v1",
      profile_id: "profile-123",
      display_name: "Asha Kumar",
      status: "approved",
      selfie_url: "https://cdn.example.com/selfies/v1.jpg",
      reviewed_by_user_id: "admin-1",
      reviewed_at: "2026-01-02T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(mapped).toEqual({
      id: "v1",
      profileId: "profile-123",
      profileDisplayName: "Asha Kumar",
      status: "approved",
      selfieUrl: "https://cdn.example.com/selfies/v1.jpg",
      reviewedByUserId: "admin-1",
      reviewedAt: "2026-01-02T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    });
  });
});
