import Link from "next/link";

/**
 * Admin home page. Links out to the two MVP admin tools.
 */
export default function HomePage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <ul>
        <li>
          <Link href="/users">User search &amp; moderation</Link>
        </li>
        <li>
          <Link href="/reports">Report queue</Link>
        </li>
      </ul>
    </div>
  );
}
