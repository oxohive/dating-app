import { AccountDeletionSteps } from "@/features/account/components/AccountDeletionSteps";

/**
 * Account deletion instructions page: thin composition of the account
 * feature component.
 */
export default function AccountDeletionPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Deleting your account</h1>
      <AccountDeletionSteps />
    </div>
  );
}
