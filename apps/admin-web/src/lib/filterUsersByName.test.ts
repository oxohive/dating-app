import { filterUsersByName } from "./filterUsersByName";

describe("filterUsersByName", () => {
  const users = [{ displayName: "Asha Kumar" }, { displayName: "Ravi Shankar" }];

  it("returns all users when the query is empty", () => {
    expect(filterUsersByName(users, "")).toHaveLength(2);
  });

  it("filters case-insensitively by substring", () => {
    expect(filterUsersByName(users, "asha")).toEqual([{ displayName: "Asha Kumar" }]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterUsersByName(users, "zzz")).toEqual([]);
  });
});
