/**
 * Keyword-based tag classifier for YouTube videos.
 * Assigns one of: "classical", "soundtrack", "turkish"
 * based on the video title, description, and hashtags.
 *
 * No AI API required — uses pattern matching only.
 */

// ── Turkish detection ──────────────────────────────────────────────────────────

const TURKISH_ARTISTS = [
  'barış manço', 'sezen aksu', 'aşık veysel', 'zülfü livaneli',
  'zülfi livaneli', 'nilüfer', 'tanju okan', 'özdemir erdoğan',
  'melih kibar', 'kayahan', 'tarkan', 'müslüm gürses', 'ajda pekkan',
  'cem karaca', 'erkin koray', 'neşet ertaş', 'münir nurettin selçuk',
  'zeki müren', 'bülent ersoy', 'fazıl say', 'idil biret',
];

const TURKISH_KEYWORDS = [
  'marşı', 'marş', 'türkü', 'bayram', 'cumhuriyet', 'atatürk',
  'çanakkale', '29 ekim', '19 mayıs', '30 ağustos', '23 nisan',
  'piyano', 'söz:', 'beste:', 'düzenleme:', 'şarkı:',
];

const TURKISH_HASHTAGS = [
  '#türkçepop', '#türküler', '#piyano', '#türkçe', '#piyanomüziği',
  '#folksong', '#marşlar', '#cumhuriyetbayramı', '#ataturk', '#atatürk',
  '#izmirmarşı', '#çanakkalezaferi',
];

// Matches Turkish-specific characters in the TITLE (strong signal)
const TURKISH_CHAR_PATTERN = /[şŞçÇğĞıİöÖüÜ]/;

// ── Classical detection ────────────────────────────────────────────────────────

const CLASSICAL_COMPOSERS = [
  'bach', 'mozart', 'beethoven', 'chopin', 'liszt', 'schubert',
  'handel', 'händel', 'debussy', 'ravel', 'tchaikovsky', 'brahms',
  'rachmaninoff', 'rachmaninov', 'schumann', 'mendelssohn', 'vivaldi',
  'haydn', 'prokofiev', 'shostakovich', 'grieg', 'satie', 'albéniz',
  'albeniz', 'grinko', 'gardel', 'clayderman', 'kempff',
];

const CLASSICAL_FORMS = [
  'sonata', 'prelude', 'prelüd', 'waltz', 'valse', 'minuet',
  'étude', 'etude', 'nocturne', 'concerto', 'symphony', 'fugue',
  'ballade', 'ständchen', 'serenade', 'opus', 'op.', 'bwv',
  'k.', 'in c major', 'in g minor', 'in a minor', 'in b minor',
  'in a major', 'in d minor', 'in e minor', 'in f major',
  'tango', 'por una cabeza', 'cabeza',
];

const CLASSICAL_HASHTAGS = [
  '#classicalmusic', '#classical', '#baroque', '#waltz', '#waltzmusic',
  '#klasikmüzik',
];

// ── Soundtrack / Film & Cover detection ────────────────────────────────────────

const SOUNDTRACK_KEYWORDS = [
  'film', 'movie', 'soundtrack', 'cover', 'pianocover',
  'theme', 'ost', 'score',
];

const SOUNDTRACK_TITLES = [
  'gladiator', 'titanic', 'chariots of fire', 'baldur\'s gate',
  'secret garden', 'the piano', 'the mermaid',
];

const SOUNDTRACK_ARTISTS = [
  'hans zimmer', 'john williams', 'ennio morricone', 'james horner',
  'vangelis', 'michael nyman', 'joe dassin', 'elvis presley', 'elvis',
  'john lennon', 'abba', 'celine dion', 'ricchi e poveri',
  'joe hisaishi', 'yann tiersen', 'ilke karcılıoğlu', 'İlke karcılıoğlu',
];

const SOUNDTRACK_HASHTAGS = [
  '#filmmusic', '#moviesoundtrack', '#pianocover', '#filmmüziği',
  '#gamemusic', '#moviescore',
];

// Normalize text for comparison: lowercase + strip combining dot above
// This handles Turkish İ → i̇ (i + U+0307 combining dot above) → i
// We only strip U+0307, not all diacritics, to preserve ğ, ş, ç, ö, ü
function normalize(text) {
  return text.toLowerCase().replace(/\u0307/g, '');
}

function score(text, titleOnly, { keywords = [], artists = [], forms = [], hashtags = [], titleCharPattern = null }) {
  let pts = 0;
  const lower = normalize(text);
  const titleLower = normalize(titleOnly);

  // Artist names are the strongest signal (4 pts each)
  for (const artist of artists) {
    if (lower.includes(artist)) pts += 4;
  }

  // Keywords (2 pts each)
  for (const kw of keywords) {
    if (lower.includes(kw)) pts += 2;
  }

  // Musical forms (2 pts each)
  for (const form of forms) {
    if (lower.includes(form)) pts += 2;
  }

  // Hashtags (1 pt each)
  for (const ht of hashtags) {
    if (lower.includes(ht)) pts += 1;
  }

  // Turkish characters in the TITLE are a moderate signal (3 pts)
  // Kept moderate to avoid false positives with Turkish-named non-Turkish artists
  if (titleCharPattern && titleCharPattern.test(titleOnly)) {
    pts += 3;
  }

  return pts;
}

/**
 * Classify a video into one of the predefined tags.
 *
 * @param {string} title - Video title
 * @param {string} description - Video description (can be empty)
 * @returns {"classical" | "soundtrack" | "turkish"} The assigned tag
 */
export function classifyVideo(title, description = '') {
  const fullText = `${title}\n${description}`;

  const turkishScore = score(fullText, title, {
    keywords: TURKISH_KEYWORDS,
    artists: TURKISH_ARTISTS,
    hashtags: TURKISH_HASHTAGS,
    titleCharPattern: TURKISH_CHAR_PATTERN,
  });

  const classicalScore = score(fullText, title, {
    keywords: [],
    artists: CLASSICAL_COMPOSERS,
    forms: CLASSICAL_FORMS,
    hashtags: CLASSICAL_HASHTAGS,
  });

  const soundtrackScore = score(fullText, title, {
    keywords: SOUNDTRACK_KEYWORDS,
    artists: SOUNDTRACK_ARTISTS,
    forms: SOUNDTRACK_TITLES,
    hashtags: SOUNDTRACK_HASHTAGS,
  });

  // Highest score wins; ties go to the priority order: turkish > classical > soundtrack
  const scores = { turkish: turkishScore, classical: classicalScore, soundtrack: soundtrackScore };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  // If the top score is 0, we can't determine anything → default to "soundtrack"
  if (sorted[0][1] === 0) return 'soundtrack';

  return sorted[0][0];
}

/**
 * The list of valid tags (exported for reference).
 */
export const VALID_TAGS = ['classical', 'soundtrack', 'turkish'];
