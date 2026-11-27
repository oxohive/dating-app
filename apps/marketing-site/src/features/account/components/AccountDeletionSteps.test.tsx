import { renderToStaticMarkup } from "react-dom/server";
import { AccountDeletionSteps } from "./AccountDeletionSteps";

describe("AccountDeletionSteps", () => {
  it("describes both the in-app and support-request deletion paths", () => {
    const html = renderToStaticMarkup(<AccountDeletionSteps />);
    expect(html).toContain("Delete Account");
    expect(html).toContain("Contact page");
  });

  it("explains that deletion cannot be undone", () => {
    const html = renderToStaticMarkup(<AccountDeletionSteps />);
    expect(html).toContain("This can&#x27;t be undone");
  });
});
