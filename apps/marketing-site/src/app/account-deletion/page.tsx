import { AccountDeletionSteps } from "@/features/account/components/AccountDeletionSteps";

/**
 * Account deletion instructions page: thin composition of the account
 * feature component.
 */
export default function AccountDeletionPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Deleting your account
        </h1>
      </div>
      <AccountDeletionSteps />
    </div>
  );
}
