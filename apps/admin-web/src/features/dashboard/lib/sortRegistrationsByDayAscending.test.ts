import { sortRegistrationsByDayAscending } from "./sortRegistrationsByDayAscending";

describe("sortRegistrationsByDayAscending", () => {
  it("orders entries oldest date first", () => {
    const result = sortRegistrationsByDayAscending([
      { date: "2026-02-03", count: 5 },
      { date: "2026-02-01", count: 2 },
      { date: "2026-02-02", count: 7 },
    ]);

    expect(result.map((entry) => entry.date)).toEqual(["2026-02-01", "2026-02-02", "2026-02-03"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { date: "2026-02-02", count: 1 },
      { date: "2026-02-01", count: 1 },
    ];
    const inputCopy = [...input];

    sortRegistrationsByDayAscending(input);

    expect(input).toEqual(inputCopy);
  });

  it("returns an empty array for an empty input", () => {
    expect(sortRegistrationsByDayAscending([])).toEqual([]);
  });
});
