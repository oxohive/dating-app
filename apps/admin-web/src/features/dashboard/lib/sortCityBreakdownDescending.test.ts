import { sortCityBreakdownDescending } from "./sortCityBreakdownDescending";

describe("sortCityBreakdownDescending", () => {
  it("orders entries by count, highest first", () => {
    const result = sortCityBreakdownDescending([
      { city: "Pune", count: 10 },
      { city: "Mumbai", count: 42 },
      { city: "Delhi", count: 25 },
    ]);

    expect(result.map((entry) => entry.city)).toEqual(["Mumbai", "Delhi", "Pune"]);
  });

  it("breaks ties alphabetically by city name", () => {
    const result = sortCityBreakdownDescending([
      { city: "Pune", count: 10 },
      { city: "Delhi", count: 10 },
    ]);

    expect(result.map((entry) => entry.city)).toEqual(["Delhi", "Pune"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { city: "Pune", count: 10 },
      { city: "Mumbai", count: 42 },
    ];
    const inputCopy = [...input];

    sortCityBreakdownDescending(input);

    expect(input).toEqual(inputCopy);
  });

  it("returns an empty array for an empty input", () => {
    expect(sortCityBreakdownDescending([])).toEqual([]);
  });
});
