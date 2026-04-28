import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Play, Share2, ListPlus } from 'lucide-react';
import videos, { TAG_LABELS } from '../data/videos';

const parseDescription = (desc) => {
  if (!desc) return { text: '', details: [] };
  
  const lines = desc.split('\n');
  const details = [];
  const textLines = [];

  lines.forEach(line => {
    const match = line.match(/^([^:]{2,45})\s*:\s*(.+)$/);
    if (
      match && 
      !line.includes('http') && 
      !match[1].includes('"') && 
      !match[1].includes('”') && 
      !match[1].includes('“') &&
      !match[1].includes('? ') &&
      !match[1].includes('. ')
    ) {
      details.push({ label: match[1].trim(), value: match[2].trim() });
    } else {
      textLines.push(line);
    }
  });

  return {
    text: textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    details
  };
};

const formatVideoUploadDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) return trimmed;
    return `${trimmed}Z`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export default function VideoDetail() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  
  const lang = (i18n.language && i18n.language.startsWith('tr')) ? 'tr' : (i18n.language && i18n.language.startsWith('it')) ? 'it' : 'en';
  
  const currentVideo = videos.find(v => v.slug === slug);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!currentVideo) {
    return (
      <div className="pt-32 pb-20 text-center text-on-surface">
        <h2 className="text-3xl font-display italic">{t('pdp.notFound', { defaultValue: 'Video not found' })}</h2>
        <Link to="/" className="text-primary mt-4 inline-block underline">{t('pdp.returnHome', { defaultValue: 'Return to Home' })}</Link>
      </div>
    );
  }

  const rawDescription = t(`archive.videoDescriptions.${currentVideo.videoId}`, { defaultValue: currentVideo.description || '' });
  const parsedDescription = parseDescription(rawDescription);

  const getThumbnail = (videoId) => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const tagLabel = (tag) => {
    return (TAG_LABELS[tag] && TAG_LABELS[tag][lang]) || (TAG_LABELS[tag] && TAG_LABELS[tag].en) || tag;
  };

  const relatedVideos = videos
    .filter(v => v.videoId !== currentVideo.videoId && v.tag === currentVideo.tag)
    .slice(0, 3);

  const videoObjectSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": currentVideo.title,
    "description": rawDescription
      ? rawDescription.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ').substring(0, 300)
      : `Piano cover of ${currentVideo.title} by Müjde Doenyas.`,
    "thumbnailUrl": [
      getThumbnail(currentVideo.videoId),
      `https://i.ytimg.com/vi/${currentVideo.videoId}/hqdefault.jpg`,
    ],
    "uploadDate": formatVideoUploadDate(currentVideo.publishedAt) || "2024-01-01T00:00:00Z",
    "duration": currentVideo.isoDuration || undefined,
    "contentUrl": `https://www.youtube.com/watch?v=${currentVideo.videoId}`,
    "embedUrl": `https://www.youtube.com/embed/${currentVideo.videoId}`,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": currentVideo.views ? currentVideo.views.replace(/[KM]/g, m => m === 'K' ? '000' : '000000').replace('.', '') : "0"
    },
    "author": {
      "@type": "Person",
      "name": "Müjde Doenyas",
      "url": "https://www.mujdedoenyas.com",
      "sameAs": [
        "https://www.youtube.com/@mujdedoenyas",
        "https://www.instagram.com/mujdedoenyas"
      ]
    },
    "publisher": {
      "@type": "Person",
      "name": "Müjde Doenyas",
      "url": "https://www.mujdedoenyas.com"
    },
    "inLanguage": "en",
    "isFamilyFriendly": true
  };
  
  Object.keys(videoObjectSchema).forEach(key => {
    if (videoObjectSchema[key] === undefined) delete videoObjectSchema[key];
  });

  return (
    <main className="pt-24 pb-20 bg-surface min-h-screen">
      <Helmet>
        <title>{currentVideo.title} | {t('seo.title')}</title>
        <meta name="description" content={videoObjectSchema.description} />
        <link rel="canonical" href={`https://www.mujdedoenyas.com/video/${currentVideo.slug}`} />
        <meta property="og:title" content={`${currentVideo.title} | ${t('seo.title')}`} />
        <meta property="og:description" content={videoObjectSchema.description} />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={`https://www.mujdedoenyas.com/video/${currentVideo.slug}`} />
        <meta property="og:image" content={getThumbnail(currentVideo.videoId)} />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="720" />
        <meta property="og:video" content={`https://www.youtube.com/embed/${currentVideo.videoId}`} />
        <meta property="og:video:type" content="text/html" />
        <meta property="og:video:width" content="1280" />
        <meta property="og:video:height" content="720" />
        <meta property="og:locale" content={i18n.language === 'tr' ? 'tr_TR' : i18n.language === 'it' ? 'it_IT' : 'en_US'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${currentVideo.title} | ${t('seo.title')}`} />
        <meta name="twitter:description" content={videoObjectSchema.description} />
        <script type="application/ld+json">{JSON.stringify(videoObjectSchema)}</script>
      </Helmet>

      {/* Video Hero Section */}
      <section className="px-4 md:px-12 mb-16">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl group bg-surface-container-lowest">
            <iframe
                src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&rel=0`}
                title={currentVideo.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
          </div>
          {/* Video Meta */}
          <div className="mt-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-display italic text-on-surface leading-tight tracking-tight">
                {currentVideo.title}
              </h1>
              <div className="flex items-center flex-wrap gap-4 font-label text-xs tracking-widest text-on-surface-variant uppercase">
                <span>{currentVideo.views} {t('pdp.views', { defaultValue: 'Views' })}</span>
                {currentVideo.likes && currentVideo.likes !== "0" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                    <span>{currentVideo.likes} {t('pdp.likes', { defaultValue: 'Likes' })}</span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                <span>{currentVideo.date}</span>
                <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-sm border border-primary/20">
                    {tagLabel(currentVideo.tag)}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="p-3 rounded-full border border-outline-variant/20 text-on-surface hover:bg-surface-container-high transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full border border-outline-variant/20 text-on-surface hover:bg-surface-container-high transition-colors">
                <ListPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Narrative & Insights */}
      <section className="px-4 md:px-12 mb-24">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Narrative */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-primary"></div>
              <span className="font-label text-xs uppercase tracking-[0.2em] text-primary">{t('pdp.narrative', { defaultValue: 'The Narrative' })}</span>
            </div>
            <div className="space-y-6 text-lg text-on-surface-variant font-light leading-relaxed whitespace-pre-wrap">
              {parsedDescription.text ? (
                 <p>{parsedDescription.text}</p>
              ) : (
                <p>{t('pdp.enjoyPerformance', { defaultValue: 'Enjoy this performance of' })} {currentVideo.title}.</p>
              )}
            </div>
          </div>
          {/* Composer Insight / Details (Asymmetric Card) */}
          <div className="lg:col-span-5">
            <div className="bg-surface-container-low rounded-xl p-10 border-l border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-5 -mr-10 -mt-10">
                <span className="material-symbols-outlined text-[200px]" style={{fontFamily: 'Material Symbols Outlined'}}>music_note</span>
              </div>
              <div className="relative z-10 space-y-6">
                <h3 className="text-3xl font-display italic text-on-surface">{t('pdp.details', { defaultValue: 'Details' })}</h3>
                <div className="space-y-4">
                    {parsedDescription.details.length > 0 ? (
                        parsedDescription.details.map((detail, idx) => (
                            <div key={idx} className="bg-surface p-4 rounded-sm border border-outline-variant/10">
                                <dt className="text-xs font-label tracking-widest uppercase text-primary mb-1">{detail.label}</dt>
                                <dd className="text-sm font-medium text-on-surface">{detail.value}</dd>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-on-surface-variant font-light leading-relaxed">
                            {t('pdp.noDetails', { defaultValue: 'No additional details provided.' })}
                        </p>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* YouTube CTA (Prominent Growth Section) */}
      <section className="px-4 md:px-12 mb-32">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-gradient-to-r from-surface-container-lowest to-surface-container-high rounded-2xl p-12 md:p-20 relative overflow-hidden group shadow-2xl">
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="space-y-4 text-center md:text-left">
                <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary font-label text-[10px] uppercase tracking-[0.2em] mb-4">{t('pdp.community', { defaultValue: 'Community' })}</span>
                <h2 className="text-4xl md:text-6xl font-display text-on-surface leading-tight">{t('pdp.joinInnerCircle', { defaultValue: 'Join the Inner Circle' })}</h2>
                <p className="text-on-surface-variant text-lg max-w-md">{t('pdp.subscribeDesc', { defaultValue: 'Subscribe for weekly high-fidelity recitals, private studio tours, and early access to new recordings.' })}</p>
              </div>
              <div className="flex flex-col items-center gap-6">
                <a 
                  href="https://www.youtube.com/@mujdedoenyas?sub_confirmation=1"
                  target="_blank" rel="noopener noreferrer"
                  className="group relative px-12 py-5 bg-primary text-on-primary rounded-md font-label uppercase tracking-[0.2em] text-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(233,195,73,0.2)]"
                >
                  <span className="relative z-10">{t('pdp.subscribeButton', { defaultValue: 'Subscribe to Mujde Doenyas' })}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Recitals */}
      <section className="px-4 md:px-12 mb-16">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-2">
              <span className="font-label text-xs uppercase tracking-[0.2em] text-primary">{t('pdp.similarPerformances', { defaultValue: 'Similar Performances' })}</span>
              <h2 className="text-4xl font-display italic text-on-surface">{t('pdp.relatedRecitals', { defaultValue: 'Related Recitals' })}</h2>
            </div>
            <Link to="/" className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
              {t('pdp.viewAllArchive', { defaultValue: 'View All Archive' })}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedVideos.map(video => (
              <Link to={`/video/${video.slug}`} key={video.videoId} className="group cursor-pointer block">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-surface-container-low">
                  <img alt={video.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90" src={getThumbnail(video.videoId)}/>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                    <Play className="text-white/80 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <h3 className="font-display text-xl text-on-surface mb-1 group-hover:text-primary transition-colors italic line-clamp-1">{video.title}</h3>
                <p className="text-xs font-label uppercase tracking-widest text-primary mb-3">{tagLabel(video.tag)}</p>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <span>{video.views} {t('pdp.views', { defaultValue: 'Views' })}</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant/30"></span>
                  <span>{video.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
