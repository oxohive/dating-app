import { ContactDetails } from "@/features/contact/components/ContactDetails";

/**
 * Contact page: thin composition of the contact feature component.
 */
export default function ContactPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Contact us
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          We&apos;re a small team, but we&apos;re here to help.
        </p>
      </div>
      <ContactDetails />
    </div>
  );
}
