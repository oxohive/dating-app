import { HEADER_LINKS, FOOTER_LINKS } from "./navLinks";

describe("navLinks", () => {
  it("includes the safety page prominently in the header", () => {
    expect(HEADER_LINKS.map((link) => link.href)).toContain("/safety");
  });

  it("wires every new policy/support page into the footer", () => {
    const hrefs = FOOTER_LINKS.map((link) => link.href);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/contact",
        "/terms",
        "/privacy",
        "/community-guidelines",
        "/account-deletion",
      ])
    );
  });

  it("has no duplicate hrefs across header and footer combined", () => {
    const allHrefs = [...HEADER_LINKS, ...FOOTER_LINKS].map((link) => link.href);
    expect(new Set(allHrefs).size).toBe(allHrefs.length);
  });

  it("gives every link a non-empty label", () => {
    for (const link of [...HEADER_LINKS, ...FOOTER_LINKS]) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });
});
