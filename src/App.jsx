import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Bio from './components/Bio';
import Archive from './components/Archive';
import Choice from './components/Choice';
import Request from './components/Request';
import Footer from './components/Footer';

function App() {
  const { t } = useTranslation();

  const seoData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://mujdedoenyas.com/#website",
        "url": "https://mujdedoenyas.com",
        "name": "Müjde Doenyas",
        "description": "Breathtaking acoustic piano covers of classical pieces, epic film soundtracks, and timeless pop songs by Müjde Doenyas.",
        "publisher": {
          "@id": "https://mujdedoenyas.com/#person"
        }
      },
      {
        "@type": "Person",
        "@id": "https://mujdedoenyas.com/#person",
        "name": "Müjde Doenyas",
        "url": "https://mujdedoenyas.com",
        "sameAs": [
          "https://www.youtube.com/@mujdedoenyas",
          "https://www.instagram.com/mujdedoenyas"
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      <Helmet>
        <title>Müjde Doenyas | Piano Covers & Classical Music</title>
        <meta name="description" content="Breathtaking acoustic piano covers of classical pieces, epic film soundtracks, and timeless pop songs by Müjde Doenyas." />
        <script type="application/ld+json">{JSON.stringify(seoData)}</script>
      </Helmet>
      <Toaster position="bottom-right" theme="dark" />
      <Navbar />
      <main>
        <Hero data={t('hero', { returnObjects: true })} />
        <Bio data={t('bio', { returnObjects: true })} />
        <Archive data={t('archive', { returnObjects: true })} />
        <Choice data={t('choices', { returnObjects: true })} />
        <Request data={t('request', { returnObjects: true })} />
      </main>
      <Footer data={t('footer', { returnObjects: true })} />
    </div>
  );
}

export default App;
