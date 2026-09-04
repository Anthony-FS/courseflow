import Feature from "@/components/landing/feature";
import Footer from "@/components/footer";
import HeroSection from "@/components/landing/hero-section";
import InstructorSection from "@/components/landing/instructor-section";
import LearningCta from "@/components/landing/learning-cta";
import ReviewSection from "@/components/landing/review-section";

export default function Home() {
  return (
    <>
      <HeroSection />
      <Feature />
      <InstructorSection />
      <ReviewSection />
      <LearningCta />
      <Footer />
    </>
  );
}
