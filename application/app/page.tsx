import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { TestimonialsSection } from "@/components/ui/testimonials-section";
import { Pricing } from "@/components/ui/pricing";
import { Footer } from "@/components/ui/footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <Pricing />
      <Footer />
    </main>
  );
}
