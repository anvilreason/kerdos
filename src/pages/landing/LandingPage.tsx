import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import Pillars from './sections/Pillars';
import FeatureShowcase from './sections/FeatureShowcase';
import PriceHistory from './sections/PriceHistory';
import UniversalCoverage from './sections/UniversalCoverage';
import ProAddon from './sections/ProAddon';
import CreatorDashboard from './sections/CreatorDashboard';
import SocialProof from './sections/SocialProof';
import FinalCTA from './sections/FinalCTA';
import Footer from './sections/Footer';

export default function LandingPage() {
  return (
    <div style={{ background: '#0d0d0d', color: 'var(--kerdos-text-primary)' }}>
      <Navbar />
      <Hero />
      <Pillars />
      <FeatureShowcase />
      <PriceHistory />
      <UniversalCoverage />
      <ProAddon />
      <CreatorDashboard />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </div>
  );
}
