# Plan: 0016-add-ui-styling

## Goal

Marketing-site and admin-web have real pages/components built across
every wave of this project, but neither app has ever had a CSS/UI
library wired in — confirmed by reading `package.json` (no Tailwind, no
component kit, no `styled-components`, nothing) and finding no
`globals.css` in either app's `src/app/`. Every page has been rendering
as bare, unstyled browser-default HTML since it was first built. The
user viewed the now-live site and asked for this to be fixed with a
real library. This task retrofits both apps with Tailwind CSS and
real, professional-looking styling for every existing page/component,
without changing any business logic, data-fetching, or test behavior.

## Library choice

**Tailwind CSS v3** for both apps — the standard, lightweight,
well-documented choice for Next.js App Router projects with zero
existing styling investment to preserve. Utility-first means retrofitting
existing components is additive (adding `className` attributes) rather
than requiring new abstractions, keeps bundle size small, and is
consistent with this repo's "no unnecessary dependencies" convention
throughout every prior wave. Do not add a heavier component library
(MUI, Chakra, shadcn/ui) — Tailwind alone is sufficient for both a
marketing site and an internal admin dashboard, and keeps scope bounded.

Additionally, to reach genuinely polished results rather than bare
utility classes slapped on:
- **A real Google Font via `next/font/google`** — not the system-font
  default. Marketing-site: something warm and modern (e.g. `Poppins` or
  `Plus Jakarta Sans` for headings, paired with `Inter` for body text —
  pick a pairing, don't use one font for everything). Admin-web: `Inter`
  alone is fine (a dashboard wants legibility and density over
  personality).
- **`lucide-react`** (lightweight, tree-shakeable icon library) for both
  apps — real icons instead of emoji or no icons at all, used
  consistently (nav, buttons, status badges, empty states).

## Bar for "done": beautiful, not just styled

The person explicitly asked for this to look *beautiful*, not merely
"no longer bare HTML." Every agent on this task should treat it as a
real visual design pass, to the standard of an actual consumer product
and an actual internal tool — not a utility-class checklist. Concretely:

- **Marketing-site**: a warm, confident, modern dating-app aesthetic.
  Think of how Hinge/Bumble-caliber landing pages feel, adapted with
  CSS only (no stock photography available) — a gradient-backed hero
  section (e.g. coral/pink/purple warmth, not generic corporate blue),
  large confident display typography for headlines, generous whitespace,
  rounded cards with soft shadows for feature/pricing/FAQ content,
  visible hover/transition states on every interactive element (buttons,
  links, accordion items, nav), a cohesive color system (one primary,
  one accent, neutral grays for text) applied identically across every
  page — home, pricing, FAQ, safety, contact, terms, privacy, community
  guidelines, account-deletion. No page should look like an afterthought
  next to the home page.
- **Admin-web**: a clean, confident, modern internal-dashboard
  aesthetic (think Linear/Stripe-dashboard caliber, not a bare `<table>`
  with borders) — a proper sidebar or top-nav shell with clear active-
  state styling, data tables with real row hover states and comfortable
  padding, status badges color-coded per state (pending/approved/
  rejected/refunded each visually distinct), buttons with clear
  primary/secondary/destructive hierarchy (the refund action should
  *look* consequential), empty/loading states that don't look broken,
  consistent card/panel styling wrapping each feature's content.
- Both apps should feel like they belong to the same product family
  (shared type scale, shared spacing scale, a recognizable but
  context-appropriate use of the brand color) without being identical —
  marketing-site warmer/bolder, admin-web calmer/denser.
- Responsive down to mobile-width viewports on marketing-site in
  particular (real traffic will be mobile-heavy for a dating app).

## Scope

### Both apps, standard Next.js App Router Tailwind setup

- Install `tailwindcss`, `postcss`, `autoprefixer` as dev dependencies.
- `tailwind.config.js` (content paths covering `src/app/**`,
  `src/features/**`, `src/components/**`), `postcss.config.js`.
- `src/app/globals.css` with `@tailwind base/components/utilities` — new
  file, import it in the root `layout.tsx`.
- Define a small shared design-token set in `tailwind.config.js`'s
  `theme.extend` (a primary brand color appropriate for a dating app —
  warm/approachable, not generic corporate blue — plus consistent
  spacing/typography scale) used consistently across every page, not
  re-invented per component.

### Marketing-site (`apps/marketing-site/src/`)

Retrofit every existing page and component with real Tailwind styling:
`Header`, `Footer`, `Hero`, `HowItWorks`, `PricingTable`, `FaqAccordion`,
`SafetyHighlights`, `ContactDetails`, `TermsContent`, `PrivacyContent`,
`CommunityGuidelines`, `AccountDeletionSteps`, `AppDownloadBadges`,
`DraftNotice`. Aim: a clean, warm, trustworthy consumer-facing look
(readable typography, generous spacing, a clear visual hierarchy for
headings/body text, styled buttons/links, a responsive layout that
works on mobile-width viewports — this is a dating app's public site,
mobile traffic matters). Keep the one-component-per-file rule; styling
only, no restructuring of component boundaries or props unless
genuinely necessary for layout.

### Admin-web (`apps/admin-web/src/`)

Retrofit every existing page and component: `Header`/nav shell, the
`users`/`reports`/`verification`/`payments`/`audit` features' tables,
badges, buttons, forms, the `RefundAction` confirm-flow, `StatusFilter`
dropdowns, `RequireAdminAuth`'s gate/login UI. Aim: a clean, legible
internal dashboard look (proper table styling with borders/zebra
striping or clear row separation, consistent button/badge styling
distinguishing status states like pending/approved/rejected/refunded
with color, readable forms) — this is a tool admins will use daily, not
a marketing surface, so prioritize information density and clarity over
visual flourish.

### Shared primitives

Both apps have their own small shared `components/` (e.g. admin-web's
`Table`/`Badge`/`Button` primitives, `StatusFilter`). Style those shared
primitives once, consistently, so every feature that composes them
automatically looks coherent — don't restyle the same button pattern
differently in five different feature directories.

## Verification (must actually prove it looks right, not just that it builds)

1. `npm run build` succeeds for both apps (Tailwind's CSS must compile
   without errors) — necessary but not sufficient.
2. Confirm the compiled CSS output is non-trivial (Tailwind's JIT only
   includes classes actually used in the scanned content paths — a
   near-empty compiled CSS file would indicate the `content` globs in
   `tailwind.config.js` aren't actually matching the real component
   files, a common Tailwind setup mistake). Check the built
   `.next/static/css/*.css` file size/contents directly.
3. If a headless browser / screenshot tool is available in your
   environment (check for Playwright or similar), actually render at
   least the home page of each app and take a screenshot to visually
   confirm real styling is applied — don't just trust that
   `className="..."` attributes exist in the source without seeing the
   rendered result. If no such tool is available, at minimum fetch the
   built page's HTML and confirm the Tailwind utility classes appear on
   real elements (not just in an unused stylesheet), and clearly state
   in your report that visual rendering wasn't directly observed.
4. Full existing test suites (typecheck/lint/jest) must stay green — this
   is a styling-only change, no component logic or test behavior should
   need to change. If a test specifically asserts on a lack of
   `className` or similar, that test's expectation was about structure,
   not styling, and should still pass; investigate rather than weaken
   any test that unexpectedly breaks.

## Decomposition (parallel, disjoint)

1. **Marketing-site styling** — `apps/marketing-site/**` only (the
   Tailwind config/setup files plus every page/component listed above).
2. **Admin-web styling** — `apps/admin-web/**` only (the Tailwind
   config/setup files plus every page/component listed above).

No shared files between the two — fully disjoint, safe to run in
parallel.

## Risks

- **Tailwind purge/content-path misconfiguration** is the most common
  real failure mode (compiles successfully but produces near-empty CSS
  because content globs don't match where components actually live) —
  explicitly verify against this, don't just trust a successful build.
- Scope is "retrofit existing components," not "redesign the
  information architecture" — don't restructure pages, rename props, or
  change component boundaries; this is additive `className` styling
  plus the Tailwind setup files only.

## Rollback

Each subtask confined to its own app directory; revert either app's
commit independently restores the previous (unstyled but functionally
identical) state.
