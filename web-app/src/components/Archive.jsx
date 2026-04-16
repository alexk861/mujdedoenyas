import { Play, X, Clock, Eye, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import videos, { TAG_LABELS } from '../data/videos';

const TAGS = ['all', 'classical', 'soundtrack', 'turkish'];

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

export default function Archive({ data }) {
  const { t, i18n } = useTranslation();
  const [activeVideo, setActiveVideo] = useState(0);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(window.innerWidth >= 1024 ? 24 : 12);
  const [activeTag, setActiveTag] = useState('all');
  const listRef = useRef(null);

  const lang = (i18n.language && i18n.language.startsWith('tr')) ? 'tr' : (i18n.language && i18n.language.startsWith('it')) ? 'it' : 'en';

  const filteredVideos = activeTag === 'all'
    ? videos
    : videos.filter((v) => v.tag === activeTag);

  const getThumbnail = (videoId) =>
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const handlePlay = () => setIsEmbedded(true);

  const handleSelectVideo = (index) => {
    // Map filtered index back to the video
    setActiveVideo(index);
    setIsEmbedded(false);
  };

  const handleTagChange = (tag) => {
    setActiveTag(tag);
    setVisibleCount(window.innerWidth >= 1024 ? 24 : 12);
    setActiveVideo(0);
    setIsEmbedded(false);
  };

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 12, filteredVideos.length));
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [activeTag]);

  const current = filteredVideos[activeVideo] || filteredVideos[0];
  if (!current) return null;

  const rawDescription = t(`archive.videoDescriptions.${current.videoId}`, { defaultValue: current.description || '' });
  const parsedDescription = parseDescription(rawDescription);

  const tagLabel = (tag) => {
    if (tag === 'all') {
      return t('archive.ui.tagAll');
    }
    return (TAG_LABELS[tag] && TAG_LABELS[tag][lang]) || (TAG_LABELS[tag] && TAG_LABELS[tag].en) || tag;
  };

  const tagCount = (tag) => {
    if (tag === 'all') return videos.length;
    return videos.filter((v) => v.tag === tag).length;
  };

  // ── VideoObject Schema (Google Rich Results compliant) ──────────────────
  const videoObjectSchema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": current.title,
    "description": rawDescription
      ? rawDescription.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 3).join(' ').substring(0, 300)
      : `Piano cover of ${current.title} by Müjde Doenyas.`,
    "thumbnailUrl": [
      `https://i.ytimg.com/vi/${current.videoId}/maxresdefault.jpg`,
      getThumbnail(current.videoId),
    ],
    // Use raw ISO date if available, otherwise construct from display date
    "uploadDate": current.publishedAt || "2024-01-01",
    // ISO 8601 duration — required by Google for rich results
    "duration": current.isoDuration || undefined,
    "contentUrl": `https://www.youtube.com/watch?v=${current.videoId}`,
    "embedUrl": `https://www.youtube.com/embed/${current.videoId}`,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": current.views ? current.views.replace(/[KM]/g, m => m === 'K' ? '000' : '000000').replace('.', '') : "0"
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

  // Remove undefined keys for clean JSON-LD output
  Object.keys(videoObjectSchema).forEach(key => {
    if (videoObjectSchema[key] === undefined) delete videoObjectSchema[key];
  });
  
  return (
    <section className="py-16 bg-surface" id="archive">
      <Helmet>
        {/* ── Dynamic OG meta tags for the active video ── */}
        <meta property="og:video" content={`https://www.youtube.com/embed/${current.videoId}`} />
        <meta property="og:video:type" content="text/html" />
        <meta property="og:video:width" content="1280" />
        <meta property="og:video:height" content="720" />
        <meta property="og:title" content={`${current.title} | Müjde Doenyas Piano Cover`} />
        <meta property="og:image" content={`https://i.ytimg.com/vi/${current.videoId}/maxresdefault.jpg`} />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="720" />
        {/* ── VideoObject structured data ── */}
        <script type="application/ld+json">{JSON.stringify(videoObjectSchema)}</script>
      </Helmet>
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-8">
          <div>
            <span className="text-primary font-label tracking-[0.2em] uppercase text-xs mb-4 block">{data.subtitle}</span>
            <h2 className="text-4xl md:text-5xl font-headline italic text-on-surface">{data.title}</h2>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <p className="text-on-surface-variant max-w-sm text-sm font-light">
              {data.description}
            </p>
            <a
              href="https://www.youtube.com/@mujdedoenyas"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
              title="YouTube Channel"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className={`px-4 py-2 text-xs font-label tracking-wider uppercase transition-all duration-200 ${
                activeTag === tag
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest hover:text-primary'
              }`}
            >
              {tagLabel(tag)}
              <span className={`ml-1.5 ${activeTag === tag ? 'text-on-primary/70' : 'opacity-40'}`}>
                {tagCount(tag)}
              </span>
            </button>
          ))}
        </div>

        {/* Main Player + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video bg-surface-container overflow-hidden">
              {isEmbedded ? (
                <iframe
                  src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&rel=0`}
                  title={current.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="group cursor-pointer w-full h-full" onClick={handlePlay}>
                  <img
                    src={getThumbnail(current.videoId)}
                    alt={current.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 group-hover:bg-black/25" />
                  <button className="absolute inset-0 m-auto z-20 w-20 h-20 bg-primary/90 text-on-primary flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 hover:bg-primary">
                    <Play className="w-8 h-8 ml-1" />
                  </button>
                  {/* Tag badge */}
                  <span className={`absolute top-4 left-4 z-20 text-[10px] font-label tracking-widest uppercase px-3 py-1 ${
                    current.tag === 'classical' ? 'bg-amber-900/60 text-amber-200'
                    : current.tag === 'turkish' ? 'bg-red-900/60 text-red-200'
                    : 'bg-blue-900/60 text-blue-200'
                  }`}>
                    {tagLabel(current.tag)}
                  </span>
                </div>
              )}
            </div>

            {/* Info and Description Panel */}
            <div className="mt-4 bg-surface-container p-5 md:p-6 rounded-sm border border-outline-variant/20">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-headline text-on-surface mb-3">{current.title}</h3>
                  <div className="flex flex-wrap gap-4 text-xs font-label tracking-wide text-on-surface-variant">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {current.duration}</span>
                    <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {current.views} {t('archive.ui.views')}</span>
                    <span className="flex items-center gap-1.5">{current.date}</span>
                  </div>
                </div>
                {isEmbedded && (
                  <button
                    onClick={() => setIsEmbedded(false)}
                    className="flex-shrink-0 text-on-surface-variant hover:text-on-surface transition-colors p-2 bg-surface hover:bg-surface-container-high rounded-full ml-4"
                    title={t('archive.ui.closeVideo')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {current.description && (
                <div className="mt-6 pt-5 border-t border-outline-variant/30 grid grid-cols-1 md:grid-cols-5 gap-6">
                  {parsedDescription.text && (
                    <div className="md:col-span-3 whitespace-pre-wrap text-[13px] md:text-sm text-on-surface-variant leading-relaxed font-light">
                      {parsedDescription.text}
                    </div>
                  )}
                  {parsedDescription.details.length > 0 && (
                    <div className={`space-y-3 ${parsedDescription.text ? 'md:col-span-2' : 'md:col-span-5'}`}>
                      {parsedDescription.details.map((detail, idx) => (
                        <div key={idx} className="bg-surface p-3 rounded-sm border border-outline-variant/10">
                          <dt className="text-[10px] font-label tracking-widest uppercase text-primary mb-1">{detail.label}</dt>
                          <dd className="text-sm font-medium text-on-surface">{detail.value}</dd>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Video List Sidebar */}
          <div className="relative lg:h-full">
            <div
              ref={listRef}
              className="flex flex-col gap-1 overflow-y-auto max-h-[500px] lg:max-h-none lg:absolute lg:inset-0 pr-1 no-scrollbar"
            >
              <div className="text-xs text-on-surface-variant font-label tracking-widest uppercase mb-2 px-2">
              {filteredVideos.length} {t('archive.ui.performances')}
            </div>
            {filteredVideos.slice(0, visibleCount).map((video, index) => (
              <div
                key={video.videoId}
                data-active={activeVideo === index}
                onClick={() => handleSelectVideo(index)}
                className={`flex gap-3 p-2 cursor-pointer transition-all duration-200 group ${
                  activeVideo === index
                    ? 'bg-surface-container-highest'
                    : 'bg-transparent hover:bg-surface-container-low'
                }`}
              >
                <div className="w-28 md:w-32 aspect-video bg-surface-container-high flex-shrink-0 relative overflow-hidden">
                  <img
                    src={getThumbnail(video.videoId)}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <Play className="w-5 h-5 text-white/80" />
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 font-mono">
                    {video.duration}
                  </span>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h4 className="text-xs md:text-sm font-semibold text-on-surface line-clamp-2 leading-tight">{video.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-on-surface-variant font-label tracking-wide">
                    <span>{video.date}</span>
                    <span>•</span>
                    <span>{video.views}</span>
                  </div>
                  {/* Tag chip */}
                  <span className={`mt-1.5 inline-block w-fit text-[9px] font-label tracking-widest uppercase px-2 py-0.5 ${
                    video.tag === 'classical' ? 'bg-amber-900/60 text-amber-200'
                    : video.tag === 'turkish' ? 'bg-red-900/60 text-red-200'
                    : 'bg-blue-900/60 text-blue-200'
                  }`}>
                    {tagLabel(video.tag)}
                  </span>
                </div>
              </div>
            ))}

            {visibleCount < filteredVideos.length && (
              <button
                onClick={loadMore}
                className="mt-2 py-3 text-xs font-label uppercase tracking-widest text-primary bg-surface-container hover:bg-surface-container-highest transition-all"
              >
                {t('archive.ui.showMore')} ({filteredVideos.length - visibleCount})
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Archive.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
};
