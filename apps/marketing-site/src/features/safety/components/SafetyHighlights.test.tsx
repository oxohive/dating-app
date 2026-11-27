import { renderToStaticMarkup } from "react-dom/server";
import { SafetyHighlights } from "./SafetyHighlights";

describe("SafetyHighlights", () => {
  it("mentions that blocking and reporting are always available", () => {
    const html = renderToStaticMarkup(<SafetyHighlights />);
    expect(html).toContain("Blocking and reporting are always available");
  });

  it("mentions suspension/ban consequences and how to get help", () => {
    const html = renderToStaticMarkup(<SafetyHighlights />);
    expect(html).toContain("suspended");
    expect(html).toContain("How to get help");
  });
});
