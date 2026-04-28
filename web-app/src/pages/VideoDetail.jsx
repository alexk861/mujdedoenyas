import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Play, Share2, ListPlus } from 'lucide-react';
import videos, { TAG_LABELS } from '../data/videos';

/* ── Helpers ─────────────────────────────────────────────────────────── */

const parseDescription = (desc) => {
  if (!desc) return { text: '', details: [] };
  const lines = desc.split('\n');
  const details = [];
  const textLines = [];
  lines.forEach(line => {
    const match = line.match(/^([^:]{2,45})\s*:\s*(.+)$/);
    if (match && !line.includes('http') && !match[1].includes('"') &&
        !match[1].includes('\u201C') && !match[1].includes('\u201D') &&
        !match[1].includes('? ') && !match[1].includes('. ')) {
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

const formatUploadDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const t = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) {
    return /[zZ]$/.test(t) || /[+-]\d{2}:\d{2}$/.test(t) ? t : `${t}Z`;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Convert view string "59,835" → integer 59835 */
const viewsToInt = (v) => {
  if (!v) return 0;
  return parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
};

/** Extract composer from parsed details */
const findDetail = (details, ...keys) => {
  const lower = keys.map(k => k.toLowerCase());
  const found = details.find(d => lower.some(k => d.label.toLowerCase().includes(k)));
  return found ? found.value : null;
};

/* ── Component ───────────────────────────────────────────────────────── */

export default function VideoDetail() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('tr') ? 'tr' : i18n.language?.startsWith('it') ? 'it' : 'en';

  const currentVideo = videos.find(v => v.slug === slug);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!currentVideo) {
    return (
      <div className="pt-32 pb-20 text-center text-on-surface">
        <h1 className="text-3xl font-display italic">{t('pdp.notFound', { defaultValue: 'Video not found' })}</h1>
        <Link to="/" className="text-primary mt-4 inline-block underline">{t('pdp.returnHome', { defaultValue: 'Return to Home' })}</Link>
      </div>
    );
  }

  const rawDescription = t(`archive.videoDescriptions.${currentVideo.videoId}`, { defaultValue: currentVideo.description || '' });
  const parsed = parseDescription(rawDescription);
  const getThumbnail = (id) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const tagLabel = (tag) => (TAG_LABELS[tag]?.[lang]) || (TAG_LABELS[tag]?.en) || tag;
  const canonicalUrl = `https://www.mujdedoenyas.com/video/${currentVideo.slug}`;
  const uploadDate = formatUploadDate(currentVideo.publishedAt) || '2024-01-01T00:00:00Z';
  const thumbUrl = getThumbnail(currentVideo.videoId);

  // Clean meta description (first meaningful lines, max 300 chars)
  const metaDesc = rawDescription
    ? rawDescription.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ').substring(0, 300)
    : `Piano performance of ${currentVideo.title} by Müjde Doenyas. ${viewsToInt(currentVideo.views).toLocaleString()} views.`;

  // Extract composer/piece from parsed details for schema enrichment
  const composer = findDetail(parsed.details, 'composed by', 'besteci', 'composer');
  const piece = findDetail(parsed.details, 'piece', 'eser', 'song');
  const arranger = findDetail(parsed.details, 'arranged by', 'düzenleme', 'pianocover by', 'piano cover by');

  const relatedVideos = videos
    .filter(v => v.videoId !== currentVideo.videoId && v.tag === currentVideo.tag)
    .slice(0, 3);

  /* ── Schema.org: @graph with VideoObject + MusicRecording + BreadcrumbList ── */
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [
      // 1. VideoObject — primary entity for Google Video Rich Results
      {
        "@type": "VideoObject",
        "@id": `${canonicalUrl}#video`,
        "name": currentVideo.title,
        "description": metaDesc,
        "thumbnailUrl": [thumbUrl, `https://i.ytimg.com/vi/${currentVideo.videoId}/hqdefault.jpg`],
        "uploadDate": uploadDate,
        ...(currentVideo.isoDuration && { "duration": currentVideo.isoDuration }),
        "contentUrl": `https://www.youtube.com/watch?v=${currentVideo.videoId}`,
        "embedUrl": `https://www.youtube.com/embed/${currentVideo.videoId}`,
        "genre": currentVideo.tag === 'classical' ? 'Classical' : currentVideo.tag === 'turkish' ? 'Turkish Classical' : 'Film Soundtrack',
        "interactionStatistic": [
          {
            "@type": "InteractionCounter",
            "interactionType": { "@type": "WatchAction" },
            "userInteractionCount": viewsToInt(currentVideo.views)
          },
          ...(currentVideo.likes && currentVideo.likes !== "0" ? [{
            "@type": "InteractionCounter",
            "interactionType": { "@type": "LikeAction" },
            "userInteractionCount": parseInt(currentVideo.likes, 10) || 0
          }] : [])
        ],
        ...(composer && {
          "about": {
            "@type": "MusicComposition",
            "name": piece || currentVideo.title,
            "composer": { "@type": "Person", "name": composer },
            ...(arranger && { "arranger": { "@type": "Person", "name": arranger } })
          }
        }),
        "author": {
          "@type": "Person",
          "@id": "https://www.mujdedoenyas.com/#person",
          "name": "Müjde Doenyas",
          "url": "https://www.mujdedoenyas.com",
          "sameAs": [
            "https://www.youtube.com/@mujdedoenyas",
            "https://www.instagram.com/mujdedoenyas"
          ]
        },
        "publisher": { "@id": "https://www.mujdedoenyas.com/#person" },
        "inLanguage": lang,
        "isFamilyFriendly": true
      },
      // 3. BreadcrumbList — navigation context for Google
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.mujdedoenyas.com/" },
          { "@type": "ListItem", "position": 2, "name": t('nav.archive', { defaultValue: 'Archive' }), "item": "https://www.mujdedoenyas.com/#archive" },
          { "@type": "ListItem", "position": 3, "name": currentVideo.title, "item": canonicalUrl }
        ]
      }
    ]
  };

  // Remove undefined values recursively
  const cleanObj = (obj) => {
    if (Array.isArray(obj)) return obj.map(cleanObj);
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, cleanObj(v)])
      );
    }
    return obj;
  };

  return (
    <main className="pt-24 pb-20 bg-surface min-h-screen" itemScope itemType="https://schema.org/VideoObject">
      <Helmet>
        {/* ── Title & Description ── */}
        <title>{currentVideo.title} | Müjde Doenyas</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1" />

        {/* ── Open Graph ── */}
        <meta property="og:title" content={`${currentVideo.title} | Müjde Doenyas`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Müjde Doenyas" />
        <meta property="og:image" content={thumbUrl} />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="720" />
        <meta property="og:image:alt" content={`${currentVideo.title} - Piano Performance by Müjde Doenyas`} />
        <meta property="og:locale" content={lang === 'tr' ? 'tr_TR' : lang === 'it' ? 'it_IT' : 'en_US'} />
        <meta property="og:locale:alternate" content="tr_TR" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:locale:alternate" content="it_IT" />

        {/* ── Twitter Card ── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${currentVideo.title} | Müjde Doenyas`} />
        <meta name="twitter:description" content={metaDesc} />
        <meta name="twitter:image" content={thumbUrl} />

        {/* ── JSON-LD: VideoObject + MusicRecording + Breadcrumbs ── */}
        <script type="application/ld+json">{JSON.stringify(cleanObj(schemaGraph))}</script>
      </Helmet>

      {/* ═══ Video Hero ═══ */}
      <section className="px-4 md:px-12 mb-16" aria-label="Video Player">
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

          {/* ── Video Meta ── */}
          <div className="mt-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-display italic text-on-surface leading-tight tracking-tight" itemProp="name">
                {currentVideo.title}
              </h1>
              <div className="flex items-center flex-wrap gap-4 font-label text-xs tracking-widest text-on-surface-variant uppercase">
                <span><span itemProp="interactionCount">{currentVideo.views}</span> {t('pdp.views', { defaultValue: 'Views' })}</span>
                {currentVideo.likes && currentVideo.likes !== "0" && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    <span>{currentVideo.likes} {t('pdp.likes', { defaultValue: 'Likes' })}</span>
                  </>
                )}
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                <time dateTime={uploadDate} itemProp="uploadDate">{currentVideo.date}</time>
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-sm border border-primary/20" itemProp="genre">
                  {tagLabel(currentVideo.tag)}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="p-3 rounded-full border border-outline-variant/20 text-on-surface hover:bg-surface-container-high transition-colors" aria-label="Share">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full border border-outline-variant/20 text-on-surface hover:bg-surface-container-high transition-colors" aria-label="Add to playlist">
                <ListPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Narrative & Details (semantic <article>) ═══ */}
      <article className="px-4 md:px-12 mb-24" aria-label="Performance Details">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Narrative */}
          <section className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-primary" />
              <span className="font-label text-xs uppercase tracking-[0.2em] text-primary">{t('pdp.narrative', { defaultValue: 'The Narrative' })}</span>
            </div>
            <div className="space-y-6 text-lg text-on-surface-variant font-light leading-relaxed whitespace-pre-wrap" itemProp="description">
              {parsed.text ? (
                <p>{parsed.text}</p>
              ) : (
                <p>{t('pdp.enjoyPerformance', { defaultValue: 'Enjoy this performance of' })} {currentVideo.title}.</p>
              )}
            </div>
          </section>

          {/* Composer Insight / Details Card */}
          <aside className="lg:col-span-5">
            <div className="bg-surface-container-low rounded-xl p-10 border-l border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-5 -mr-10 -mt-10">
                <span className="material-symbols-outlined text-[200px]" style={{fontFamily: 'Material Symbols Outlined'}}>music_note</span>
              </div>
              <div className="relative z-10 space-y-6">
                <h2 className="text-3xl font-display italic text-on-surface">{t('pdp.details', { defaultValue: 'Details' })}</h2>
                {parsed.details.length > 0 ? (
                  <dl className="space-y-4">
                    {parsed.details.map((detail, idx) => (
                      <div key={idx} className="bg-surface p-4 rounded-sm border border-outline-variant/10">
                        <dt className="text-xs font-label tracking-widest uppercase text-primary mb-1">{detail.label}</dt>
                        <dd className="text-sm font-medium text-on-surface">{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-on-surface-variant font-light leading-relaxed">
                    {t('pdp.noDetails', { defaultValue: 'No additional details provided.' })}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </article>

      {/* ═══ YouTube CTA ═══ */}
      <section className="px-4 md:px-12 mb-32" aria-label="Subscribe">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-gradient-to-r from-surface-container-lowest to-surface-container-high rounded-2xl p-12 md:p-20 relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="space-y-4 text-center md:text-left">
                <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary font-label text-[10px] uppercase tracking-[0.2em] mb-4">{t('pdp.community', { defaultValue: 'Community' })}</span>
                <h2 className="text-4xl md:text-6xl font-display text-on-surface leading-tight">{t('pdp.joinInnerCircle', { defaultValue: 'Join the Inner Circle' })}</h2>
                <p className="text-on-surface-variant text-lg max-w-md">{t('pdp.subscribeDesc')}</p>
              </div>
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
      </section>

      {/* ═══ Related Recitals ═══ */}
      <nav className="px-4 md:px-12 mb-16" aria-label="Related Performances">
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
                  <img alt={`${video.title} - Piano Cover`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90" src={getThumbnail(video.videoId)} loading="lazy" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                    <Play className="text-white/80 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <h3 className="font-display text-xl text-on-surface mb-1 group-hover:text-primary transition-colors italic line-clamp-1">{video.title}</h3>
                <p className="text-xs font-label uppercase tracking-widest text-primary mb-3">{tagLabel(video.tag)}</p>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  <span>{video.views} {t('pdp.views', { defaultValue: 'Views' })}</span>
                  <span className="w-1 h-1 rounded-full bg-outline-variant/30" />
                  <span>{video.date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </main>
  );
}
