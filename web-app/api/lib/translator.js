/**
 * Free translation helper using MyMemory API.
 * No API key required. Free tier: 5000 chars/day.
 * https://mymemory.translated.net/doc/spec.php
 *
 * Handles bilingual YouTube descriptions (Turkish + English paragraphs):
 * - Separates TR and EN prose blocks
 * - Strips subscribe/abone spam lines
 * - Strips hashtag blocks and piano model lines
 * - For EN: uses the English portion directly
 * - For TR: uses the Turkish portion directly
 * - For IT: translates the English portion to Italian via API
 * - Translates credit labels via built-in dictionary
 */

// ── Subscribe / spam patterns to strip ─────────────────────────────────────────

const SUBSCRIBE_PATTERNS = [
  /subscribe/i,
  /abone/i,
  /follow.*new.*video/i,
  /yeni.*video.*takip/i,
  /kanalım(a|ı)/i,
  /channel/i,
  /like.*share/i,
  /beğen.*paylaş/i,
  /notification.*bell/i,
  /bildiri.*zil/i,
];

function isSubscribeLine(line) {
  return SUBSCRIBE_PATTERNS.some(p => p.test(line));
}

// ── Invitation / promo phrases to strip ────────────────────────────────────────

const PROMO_PATTERNS = [
  /follow.*journey/i,
  /yolculuğ.*takip/i,
  /invitation.*resonances/i,
  /gelecek.*rezonans/i,
  /please.*subscribe/i,
  /Would you like to follow/i,
  /Yeni videoları takip etmek/i,
];

function isPromoLine(line) {
  return PROMO_PATTERNS.some(p => p.test(line));
}

// ── Language detection ─────────────────────────────────────────────────────────

const TURKISH_CHARS = /[çÇğĞıİşŞ]/g;  // ö Ö ü Ü exist in German too, so excluded
const TURKISH_WORDS = /\b(ve|bir|bu|için|ile|olan|olarak|olan|yazılan|eser|aşk|izler|taşır|zamanla|hatıralar|silinen|bayram|kutlu|tablo|ressam|sanat|söz|müzik|beste|düzenleme|şarkı|piyano)\b/gi;

function isTurkish(text) {
  if (!text) return false;
  const charHits = (text.match(TURKISH_CHARS) || []).length;
  const wordHits = (text.match(TURKISH_WORDS) || []).length;
  return charHits >= 2 || wordHits >= 2;
}

// ── MyMemory API ───────────────────────────────────────────────────────────────

/**
 * Translate text using MyMemory free API.
 */
async function translateText(text, from, to) {
  if (!text || !text.trim()) return text;
  if (from === to) return text;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[translator] MyMemory API returned ${res.status}, falling back to original`);
    return text;
  }

  const data = await res.json();

  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    let translated = data.responseData.translatedText;
    // MyMemory sometimes returns ALL-UPPERCASE for short strings — keep original
    if (translated === translated.toUpperCase() && text !== text.toUpperCase()) {
      return text;
    }
    return translated;
  }

  console.warn('[translator] MyMemory returned unexpected response, using original');
  return text;
}

// ── Description parser ─────────────────────────────────────────────────────────

/**
 * Parse a YouTube description into structured parts.
 *
 * Bilingual descriptions typically look like:
 *   Turkish paragraph(s)
 *   [blank line]
 *   English paragraph(s)     ← same content translated
 *   [blank line]
 *   Credit lines (Label: Value)
 *   [blank line]
 *   Promo / subscribe lines  ← strip these
 *   [blank line]
 *   #hashtags
 *   🎹 Piano model
 *
 * @returns {{ trProse: string, enProse: string, credits: string[], hashtags: string, pianoLine: string }}
 */
function parseDescription(description) {
  if (!description) return { trProse: '', enProse: '', credits: [], hashtags: '', pianoLine: '' };

  const lines = description.split('\n');
  const proseLines = [];
  const creditLines = [];
  let hashtagBlock = '';
  let pianoLine = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      proseLines.push('');  // keep blank lines for paragraph splitting
      continue;
    }

    // Piano model line (🎹 ...)
    if (trimmed.startsWith('🎹')) {
      pianoLine = trimmed;
      continue;
    }

    // Hashtag line
    if (trimmed.startsWith('#') || (trimmed.includes('#') && trimmed.split('#').length > 3)) {
      hashtagBlock = trimmed;
      continue;
    }

    // Subscribe / promo spam — strip entirely
    if (isSubscribeLine(trimmed) || isPromoLine(trimmed)) {
      continue;
    }

    // Credit lines: "Label: Value" — short label, not a sentence
    const creditMatch = trimmed.match(/^([A-Za-zÀ-ÿçÇğĞıİöÖşŞüÜ\s&'.]{2,40}):\s*(.+)$/);
    if (
      creditMatch &&
      !trimmed.includes('"') && !trimmed.includes('\u201c') && !trimmed.includes('\u201d') &&
      !trimmed.includes('?') &&
      !/\.\s/.test(creditMatch[1])  // label shouldn't contain sentences
    ) {
      creditLines.push(trimmed);
      continue;
    }

    proseLines.push(line);
  }

  // Now split prose into TR and EN blocks
  // Strategy: group consecutive non-blank lines into paragraphs,
  // then classify each paragraph as TR or EN
  const proseText = proseLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = proseText.split(/\n\s*\n/).filter(p => p.trim());

  const trParagraphs = [];
  const enParagraphs = [];

  for (const para of paragraphs) {
    if (isTurkish(para)) {
      trParagraphs.push(para.trim());
    } else {
      enParagraphs.push(para.trim());
    }
  }

  return {
    trProse: trParagraphs.join('\n\n'),
    enProse: enParagraphs.join('\n\n'),
    credits: creditLines,
    hashtags: hashtagBlock,
    pianoLine,
  };
}

// ── Credit label translations ──────────────────────────────────────────────────

const CREDIT_LABELS = {
  en: {
    'Song': 'Song', 'Şarkı': 'Song', 'Brano': 'Song', 'Parça': 'Song',
    'Composed by': 'Composed by', 'Beste': 'Composed by', 'Besteci': 'Composed by',
    'Compositore': 'Composed by', 'Composto da': 'Composed by',
    'Lyrics': 'Lyrics', 'Söz': 'Lyrics', 'Testi': 'Lyrics', 'Söz ve Müzik': 'Lyrics & Music',
    'Music': 'Music', 'Müzik': 'Music', 'Musica': 'Music',
    'Arranged by': 'Arranged by', 'Düzenleme': 'Arranged by', 'Arrangiamento': 'Arranged by',
    'Piano cover': 'Piano cover', 'Piano cover by': 'Piano cover by',
    'Piano arrangement': 'Piano arrangement', 'Cover per piano': 'Piano cover',
    'Piyano düzenleme': 'Piano arrangement',
    'Painting by': 'Painting by', 'Tablo': 'Painting by', 'Ressam': 'Painting by', 'Dipinto di': 'Painting by',
    'Digital Art': 'Digital Art', 'Digital Art by': 'Digital Art by', 'Arte digitale': 'Digital Art',
    'Art Gallery': 'Art Gallery', 'Sanat Galerisi': 'Art Gallery', 'Galleria d\'arte': 'Art Gallery',
    'Video Recording & Post Production': 'Video Recording & Post Production',
    'Video Kayıt & Kurgu': 'Video Recording & Post Production',
    'Video recording & Post production': 'Video Recording & Post Production',
    'Video & Post Production': 'Video & Post Production',
    'Video ve post prodüksiyon': 'Video Recording & Post Production',
    'Violin': 'Violin', 'Keman': 'Violin', 'Violino': 'Violin',
    'Artistic Print': 'Artistic Print', 'Sanatsal Baskı': 'Artistic Print', 'Stampa artistica': 'Artistic Print',
    'Kaftan designed by': 'Kaftan designed by',
    'Ceramic Artist': 'Ceramic Artist', 'Seramik sanatçısı': 'Ceramic Artist', 'Artista ceramista': 'Ceramic Artist',
    'Fine Art Photograph': 'Fine Art Photograph', 'Fotografia d\'arte': 'Fine Art Photograph',
    'Written by': 'Written by', 'Scritto da': 'Written by',
    'Produced by': 'Produced by', 'Yapımcı': 'Produced by', 'Prodotto da': 'Produced by',
    'Composer': 'Composer', 'Compositore': 'Composer',
    'Artist': 'Artist', 'Artista': 'Artist', 'Sanatçı': 'Artist',
  },
  tr: {
    'Song': 'Şarkı', 'Şarkı': 'Şarkı', 'Brano': 'Şarkı', 'Parça': 'Parça',
    'Composed by': 'Beste', 'Beste': 'Beste', 'Besteci': 'Besteci',
    'Lyrics': 'Söz', 'Söz': 'Söz', 'Testi': 'Söz', 'Söz ve Müzik': 'Söz ve Müzik',
    'Music': 'Müzik', 'Müzik': 'Müzik', 'Musica': 'Müzik',
    'Arranged by': 'Düzenleme', 'Düzenleme': 'Düzenleme', 'Arrangiamento': 'Düzenleme',
    'Piano cover': 'Piyano düzenleme', 'Piano cover by': 'Piyano düzenleme',
    'Piano arrangement': 'Piyano düzenleme', 'Cover per piano': 'Piyano düzenleme',
    'Piyano düzenleme': 'Piyano düzenleme',
    'Painting by': 'Tablo', 'Tablo': 'Tablo', 'Ressam': 'Ressam', 'Dipinto di': 'Tablo',
    'Digital Art': 'Dijital Sanat', 'Digital Art by': 'Dijital Sanat',
    'Art Gallery': 'Sanat Galerisi', 'Sanat Galerisi': 'Sanat Galerisi',
    'Video Recording & Post Production': 'Video Kayıt & Kurgu',
    'Video Kayıt & Kurgu': 'Video Kayıt & Kurgu',
    'Video recording & Post production': 'Video Kayıt & Kurgu',
    'Video & Post Production': 'Video & Kurgu',
    'Video ve post prodüksiyon': 'Video Kayıt & Kurgu',
    'Violin': 'Keman', 'Keman': 'Keman', 'Violino': 'Keman',
    'Artistic Print': 'Sanatsal Baskı', 'Sanatsal Baskı': 'Sanatsal Baskı',
    'Written by': 'Söz', 'Produced by': 'Yapımcı', 'Yapımcı': 'Yapımcı',
    'Composer': 'Besteci', 'Compositore': 'Besteci',
    'Artist': 'Sanatçı', 'Artista': 'Sanatçı', 'Sanatçı': 'Sanatçı',
  },
  it: {
    'Song': 'Brano', 'Şarkı': 'Brano', 'Brano': 'Brano', 'Parça': 'Brano',
    'Composed by': 'Compositore', 'Beste': 'Compositore', 'Besteci': 'Compositore',
    'Lyrics': 'Testi', 'Söz': 'Testi', 'Testi': 'Testi', 'Söz ve Müzik': 'Testi e Musica',
    'Music': 'Musica', 'Müzik': 'Musica', 'Musica': 'Musica',
    'Arranged by': 'Arrangiamento', 'Düzenleme': 'Arrangiamento', 'Arrangiamento': 'Arrangiamento',
    'Piano cover': 'Cover per piano', 'Piano cover by': 'Cover per piano',
    'Piano arrangement': 'Arrangiamento per pianoforte', 'Cover per piano': 'Cover per piano',
    'Piyano düzenleme': 'Arrangiamento per pianoforte',
    'Painting by': 'Dipinto di', 'Tablo': 'Dipinto di', 'Ressam': 'Dipinto di',
    'Digital Art': 'Arte digitale', 'Digital Art by': 'Arte digitale',
    'Art Gallery': 'Galleria d\'arte', 'Sanat Galerisi': 'Galleria d\'arte',
    'Video Recording & Post Production': 'Registrazione video e post produzione',
    'Video Kayıt & Kurgu': 'Registrazione video e post produzione',
    'Video recording & Post production': 'Registrazione video e post produzione',
    'Video & Post Production': 'Video e post produzione',
    'Video ve post prodüksiyon': 'Registrazione video e post produzione',
    'Violin': 'Violino', 'Keman': 'Violino', 'Violino': 'Violino',
    'Artistic Print': 'Stampa artistica', 'Sanatsal Baskı': 'Stampa artistica',
    'Written by': 'Scritto da', 'Produced by': 'Prodotto da', 'Yapımcı': 'Prodotto da',
    'Composer': 'Compositore', 'Compositore': 'Compositore',
    'Artist': 'Artista', 'Artista': 'Artista', 'Sanatçı': 'Artista',
  },
};

/**
 * Translate a credit line's label to the target language.
 */
function translateCreditLabel(creditLine, targetLang) {
  const match = creditLine.match(/^(.+?):\s*(.+)$/);
  if (!match) return creditLine;

  const label = match[1].trim();
  const value = match[2].trim();
  const labelMap = CREDIT_LABELS[targetLang] || CREDIT_LABELS.en;

  const translatedLabel = labelMap[label] || label;
  return `${translatedLabel}: ${value}`;
}

// ── Main translation logic ─────────────────────────────────────────────────────

/**
 * Translate a full video description for a target locale.
 *
 * Strategy for bilingual descriptions:
 *   EN → use English prose directly, no API call
 *   TR → use Turkish prose directly, no API call
 *   IT → translate English prose to Italian via MyMemory API
 *
 * For monolingual descriptions:
 *   Translate prose via API if source ≠ target
 *
 * Always:
 *   - Strip subscribe/promo spam lines
 *   - Translate credit labels via dictionary
 *   - Strip hashtags (not shown on site)
 *   - Keep piano model line
 */
export async function translateDescription(description, targetLang) {
  if (!description || !description.trim()) return description;

  const { trProse, enProse, credits, hashtags, pianoLine } = parseDescription(description);

  const isBilingual = trProse && enProse;

  // Pick the right prose for the target language
  let prose;
  if (targetLang === 'tr') {
    // For Turkish: use TR prose (or translate EN → TR if monolingual EN)
    prose = trProse || (enProse ? await translateText(enProse, 'en', 'tr') : '');
  } else if (targetLang === 'en') {
    // For English: use EN prose (or translate TR → EN if monolingual TR)
    prose = enProse || (trProse ? await translateText(trProse, 'tr', 'en') : '');
  } else if (targetLang === 'it') {
    // For Italian: translate EN prose to IT (prefer EN as source for better quality)
    const source = enProse || trProse;
    const sourceLang = enProse ? 'en' : 'tr';
    prose = source ? await translateText(source, sourceLang, 'it') : '';
  }

  // Translate credit labels
  const translatedCredits = credits.map(line => translateCreditLabel(line, targetLang));

  // Reassemble (clean, no hashtags — the site doesn't show them)
  const parts = [];
  if (prose) parts.push(prose);
  if (translatedCredits.length > 0) parts.push(translatedCredits.join('\n'));
  // Hashtags stripped intentionally — they clutter the description panel
  if (pianoLine) parts.push(pianoLine);

  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Translate descriptions for multiple new videos into all three locales.
 */
export async function translateNewVideoDescriptions(newVideos) {
  const results = { en: {}, tr: {}, it: {} };

  for (const video of newVideos) {
    const { videoId, description } = video;
    if (!description) continue;

    console.log(`[translator] Translating description for "${video.title || videoId}"...`);

    for (const lang of ['en', 'tr', 'it']) {
      try {
        results[lang][videoId] = await translateDescription(description, lang);
        // Small delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.warn(`[translator] Error translating ${videoId} to ${lang}:`, err.message);
        results[lang][videoId] = description; // fallback to original
      }
    }
  }

  return results;
}
