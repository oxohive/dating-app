import Link from "next/link";
import { Users, Flag, LogIn, ArrowRight } from "lucide-react";

const QUICK_LINKS = [
  {
    href: "/users",
    label: "User search & moderation",
    description: "Find a user, review their profile, and suspend accounts that break the rules.",
    icon: Users,
  },
  {
    href: "/reports",
    label: "Report queue",
    description: "Work through user-submitted reports and mark them resolved.",
    icon: Flag,
  },
  {
    href: "/login",
    label: "Admin sign in",
    description: "Sign in with your admin phone number to unlock the gated tools.",
    icon: LogIn,
  },
];

/**
 * Admin home page. Links out to the two MVP admin tools.
 */
export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Quick links to the tools your team uses most.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-100">
                <Icon size={18} className="text-primary-600" />
              </div>
              <div>
                <p className="flex items-center gap-1 font-semibold text-slate-900">
                  {link.label}
                  <ArrowRight
                    size={15}
                    className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600"
                  />
                </p>
                <p className="mt-1 text-sm text-slate-500">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
