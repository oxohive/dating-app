import { Hero } from "@/features/home/components/Hero";
import { HowItWorks } from "@/features/home/components/HowItWorks";

/**
 * Home page: thin composition of home feature components.
 */
export default function HomePage() {
  return (
    <div>
      <Hero />
      <HowItWorks />
    </div>
  );
}
