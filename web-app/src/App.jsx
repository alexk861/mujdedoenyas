import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import VideoDetail from './pages/VideoDetail';

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
        "description": t('seo.description'),
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
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
        <link rel="canonical" href="https://www.mujdedoenyas.com/" />
        <meta property="og:title" content={t('seo.title')} />
        <meta property="og:description" content={t('seo.description')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.mujdedoenyas.com" />
        <meta property="og:image" content="https://www.mujdedoenyas.com/og-image.jpg" />
        <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : i18n.language === 'it' ? 'it_IT' : 'en_US'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('seo.title')} />
        <meta name="twitter:description" content={t('seo.description')} />
        <script type="application/ld+json">{JSON.stringify(seoData)}</script>
      </Helmet>
      <Toaster position="bottom-right" theme="dark" />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/video/:slug" element={<VideoDetail />} />
      </Routes>
      <Footer data={t('footer', { returnObjects: true })} />
    </div>
  );
}

export default App;
