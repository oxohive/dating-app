import { mapDashboardAnalytics } from "./dashboard.api";

describe("mapDashboardAnalytics", () => {
  it("maps every snake_case field to its camelCase equivalent", () => {
    const mapped = mapDashboardAnalytics({
      total_users: 100,
      total_profiles: 80,
      active_premium_count: 12,
      total_likes: 500,
      total_matches: 60,
      total_messages: 900,
      registrations_by_day: [{ day: "2026-02-01", count: 3 }],
      users_by_city: [{ city: "Mumbai", count: 40 }],
    });

    expect(mapped).toEqual({
      totalUsers: 100,
      totalProfiles: 80,
      activePremiumCount: 12,
      totalLikes: 500,
      totalMatches: 60,
      totalMessages: 900,
      registrationsByDay: [{ date: "2026-02-01", count: 3 }],
      usersByCity: [{ city: "Mumbai", count: 40 }],
    });
  });

  it("maps empty series to empty arrays", () => {
    const mapped = mapDashboardAnalytics({
      total_users: 0,
      total_profiles: 0,
      active_premium_count: 0,
      total_likes: 0,
      total_matches: 0,
      total_messages: 0,
      registrations_by_day: [],
      users_by_city: [],
    });

    expect(mapped.registrationsByDay).toEqual([]);
    expect(mapped.usersByCity).toEqual([]);
  });
});
