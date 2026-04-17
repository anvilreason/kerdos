import Navbar from './sections/Navbar';
// W4-03: HeroV2 replaces the original Hero on the Landing render path.
// The old Hero.tsx file is intentionally kept on disk (untouched here) so
// W4-02 Agent's "Download button" patch can still land against it without
// a merge conflict. After W4 merges land, Hero.tsx can be deleted.
import HeroV2 from './sections/HeroV2';
import Pillars from './sections/Pillars';
import PrivacyEvidence from './sections/PrivacyEvidence';
import FeatureShowcase from './sections/FeatureShowcase';
import PriceHistory from './sections/PriceHistory';
import UniversalCoverage from './sections/UniversalCoverage';
// ProAddon / CreatorDashboard removed in v2.0 —
// the paid-add-on and creator-economy angles don't fit the C-end middle-class
// positioning. The Landing will be rewritten in W4 (T-W4-03) to match the
// "local-first asset tracker" narrative with a Notion-style layout.
import SocialProof from './sections/SocialProof';
import DownloadSection from './sections/DownloadSection';
import FinalCTA from './sections/FinalCTA';
import Footer from './sections/Footer';

export default function LandingPage() {
  return (
    <div style={{ background: '#0d0d0d', color: 'var(--kerdos-text-primary)' }}>
      <Navbar />
      <HeroV2 />
      <Pillars />
      <PrivacyEvidence />
      <FeatureShowcase />
      <PriceHistory />
      <UniversalCoverage />
      <SocialProof />
      <DownloadSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
