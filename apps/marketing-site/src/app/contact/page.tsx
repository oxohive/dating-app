import { ContactDetails } from "@/features/contact/components/ContactDetails";

/**
 * Contact page: thin composition of the contact feature component.
 */
export default function ContactPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Contact us</h1>
      <ContactDetails />
    </div>
  );
}
