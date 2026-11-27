import { Hero } from "@/features/home/components/Hero";
import { HowItWorks } from "@/features/home/components/HowItWorks";
import { AppDownloadBadges } from "@/features/home/components/AppDownloadBadges";

/**
 * Home page: thin composition of home feature components.
 */
export default function HomePage() {
  return (
    <div>
      <Hero />
      <HowItWorks />
      <AppDownloadBadges />
    </div>
  );
}
