import Navbar from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { ProblemSolution } from '../components/ProblemSolution';
import { FeaturesSection } from '../components/FeaturesSection';
import { HowItWorks } from '../components/HowItWorks';
import { DemoPreview } from '../components/DemoPreview';
import { BenefitsSection } from '../components/BenefitsSection';
import { PricingSection } from '../components/PricingSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';


const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection onGetStarted={()=>{}} />
        <ProblemSolution />
        <FeaturesSection />
        <HowItWorks />
        <DemoPreview />
        <BenefitsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default Home