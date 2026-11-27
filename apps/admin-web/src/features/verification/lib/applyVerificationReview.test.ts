import { applyVerificationReview } from "./applyVerificationReview";
import { Verification } from "@/features/verification/api/verification.api";

function makeVerification(overrides: Partial<Verification> = {}): Verification {
  return {
    id: "v1",
    profileId: "p1",
    profileDisplayName: "Asha Kumar",
    status: "pending",
    selfieUrl: "https://cdn.example.com/selfies/v1.jpg",
    reviewedByUserId: null,
    reviewedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("applyVerificationReview", () => {
  it("replaces the matching verification with the reviewed result", () => {
    const pending = makeVerification();
    const other = makeVerification({ id: "v2", profileDisplayName: "Ravi Shankar" });
    const approved = makeVerification({
      status: "approved",
      reviewedByUserId: "admin-1",
      reviewedAt: "2026-01-02T00:00:00Z",
    });

    const result = applyVerificationReview([pending, other], approved);

    expect(result).toEqual([approved, other]);
  });

  it("leaves the list unchanged when no id matches", () => {
    const pending = makeVerification();
    const unrelatedUpdate = makeVerification({ id: "does-not-exist", status: "rejected" });

    const result = applyVerificationReview([pending], unrelatedUpdate);

    expect(result).toEqual([pending]);
  });

  it("returns an empty array for an empty list", () => {
    expect(applyVerificationReview([], makeVerification())).toEqual([]);
  });
});
