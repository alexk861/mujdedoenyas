import { useEffect } from 'react';
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
  const { t, i18n } = useTranslation();

  // Dynamically update <html lang> on language switch
  useEffect(() => {
    const lang = i18n.language?.startsWith('tr') ? 'tr' : i18n.language?.startsWith('it') ? 'it' : 'en';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  const seoData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.mujdedoenyas.com/#website",
        "url": "https://www.mujdedoenyas.com",
        "name": "Müjde Doenyas",
        "description": "Breathtaking acoustic piano covers of classical pieces, epic film soundtracks, and timeless pop songs by Müjde Doenyas.",
        "publisher": {
          "@id": "https://www.mujdedoenyas.com/#person"
        }
      },
      {
        "@type": "Person",
        "@id": "https://www.mujdedoenyas.com/#person",
        "name": "Müjde Doenyas",
        "url": "https://www.mujdedoenyas.com",
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
        <meta property="og:title" content="Müjde Doenyas | Piano Covers & Classical Music" />
        <meta property="og:description" content="Breathtaking acoustic piano covers of classical pieces, epic film soundtracks, and timeless pop songs by Müjde Doenyas." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.mujdedoenyas.com" />
        <meta property="og:image" content="https://www.mujdedoenyas.com/og-image.jpg" />
        <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : i18n.language === 'it' ? 'it_IT' : 'en_US'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Müjde Doenyas | Piano Covers & Classical Music" />
        <meta name="twitter:description" content="Breathtaking acoustic piano covers of classical pieces, epic film soundtracks, and timeless pop songs by Müjde Doenyas." />
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
