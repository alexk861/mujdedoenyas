/**
 * Free translation helper using MyMemory API.
 * No API key required. Free tier: 5000 chars/day.
 * https://mymemory.translated.net/doc/spec.php
 *
 * For our use case (1-2 new video descriptions per day), this is plenty.
 */

/**
 * Translate text using MyMemory free API.
 * @param {string} text - Text to translate
 * @param {string} from - Source language code (e.g. 'en', 'tr')
 * @param {string} to - Target language code (e.g. 'it', 'en')
 * @returns {Promise<string>} Translated text
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
    // MyMemory sometimes returns UPPERCASE text for short strings — fix that
    if (translated === translated.toUpperCase() && text !== text.toUpperCase()) {
      // Only the first char upper, rest as-is — keep original in this case
      return text;
    }
    return translated;
  }

  console.warn('[translator] MyMemory returned unexpected response, using original');
  return text;
}

/**
 * Split a YouTube description into translatable content vs. metadata.
 * We translate the prose text but keep hashtags, piano model, and credits as-is.
 *
 * @param {string} description - Raw YouTube video description
 * @returns {{ prose: string, credits: string[], hashtags: string, pianoLine: string }}
 */
function splitDescription(description) {
  if (!description) return { prose: '', credits: [], hashtags: '', pianoLine: '' };

  const lines = description.split('\n');
  const proseLines = [];
  const creditLines = [];
  let hashtagBlock = '';
  let pianoLine = '';

  for (const line of lines) {
    const trimmed = line.trim();

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

    // Credit lines: "Label: Value" pattern (short label, no sentences)
    const creditMatch = trimmed.match(/^([A-Za-zÀ-ÿçÇğĞıİöÖşŞüÜ\s&]{2,35}):\s*(.+)$/);
    if (creditMatch && !trimmed.includes('"') && !trimmed.includes('"') && !trimmed.includes('?')) {
      creditLines.push(trimmed);
      continue;
    }

    proseLines.push(line);
  }

  return {
    prose: proseLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    credits: creditLines,
    hashtags: hashtagBlock,
    pianoLine,
  };
}

/**
 * Detect if text is predominantly Turkish based on character patterns.
 * @param {string} text
 * @returns {boolean}
 */
function isTurkish(text) {
  const turkishChars = /[çÇğĞıİöÖşŞüÜ]/g;
  const turkishWords = /\b(ve|bir|bu|için|ile|olan|olarak|şarkı|beste|düzenleme|söz|müzik|bayram|kutlu|tablo|ressam|sanat)\b/gi;
  const charMatches = (text.match(turkishChars) || []).length;
  const wordMatches = (text.match(turkishWords) || []).length;
  return charMatches >= 2 || wordMatches >= 2;
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
    'Pianocover': 'Piano cover', 'Pianocover by': 'Piano cover by',
    'Piano arrangement': 'Piano arrangement', 'Cover per piano': 'Piano cover',
    'Painting by': 'Painting by', 'Tablo': 'Painting by', 'Ressam': 'Painting by', 'Dipinto di': 'Painting by',
    'Digital Art': 'Digital Art', 'Digital Art by': 'Digital Art by', 'Arte digitale': 'Digital Art',
    'Art Gallery': 'Art Gallery', 'Sanat Galerisi': 'Art Gallery', 'Galleria d\'arte': 'Art Gallery',
    'Video Recording & Post Production': 'Video Recording & Post Production',
    'Video Kayıt & Kurgu': 'Video Recording & Post Production',
    'Video recording & Post production': 'Video Recording & Post Production',
    'Video & Post Production': 'Video & Post Production',
    'Violin': 'Violin', 'Violino': 'Violin',
    'Artistic Print': 'Artistic Print', 'Sanatsal Baskı': 'Artistic Print', 'Stampa artistica': 'Artistic Print',
    'Kaftan designed by': 'Kaftan designed by',
    'Ceramic Artist': 'Ceramic Artist', 'Seramik sanatçısı': 'Ceramic Artist', 'Artista ceramista': 'Ceramic Artist',
    'Fine Art Photograph': 'Fine Art Photograph', 'Fotografia d\'arte': 'Fine Art Photograph',
    'Written by': 'Written by', 'Scritto da': 'Written by',
    'Produced by': 'Produced by', 'Yapımcı': 'Produced by', 'Prodotto da': 'Produced by',
    'Composer': 'Composer', 'Compositore': 'Composer',
    'Artist': 'Artist', 'Artista': 'Artist',
  },
  tr: {
    'Song': 'Şarkı', 'Şarkı': 'Şarkı', 'Brano': 'Şarkı', 'Parça': 'Şarkı',
    'Composed by': 'Beste', 'Beste': 'Beste', 'Besteci': 'Besteci',
    'Lyrics': 'Söz', 'Söz': 'Söz', 'Testi': 'Söz', 'Söz ve Müzik': 'Söz ve Müzik',
    'Music': 'Müzik', 'Müzik': 'Müzik', 'Musica': 'Müzik',
    'Arranged by': 'Düzenleme', 'Düzenleme': 'Düzenleme', 'Arrangiamento': 'Düzenleme',
    'Pianocover': 'Düzenleme', 'Pianocover by': 'Düzenleme',
    'Piano arrangement': 'Piyano düzenleme', 'Cover per piano': 'Düzenleme',
    'Painting by': 'Tablo', 'Tablo': 'Tablo', 'Ressam': 'Ressam', 'Dipinto di': 'Tablo',
    'Digital Art': 'Dijital Sanat', 'Digital Art by': 'Dijital Sanat',
    'Art Gallery': 'Sanat Galerisi', 'Sanat Galerisi': 'Sanat Galerisi',
    'Video Recording & Post Production': 'Video Kayıt & Kurgu',
    'Video Kayıt & Kurgu': 'Video Kayıt & Kurgu',
    'Video recording & Post production': 'Video Kayıt & Kurgu',
    'Video & Post Production': 'Video & Kurgu',
    'Violin': 'Keman', 'Violino': 'Keman',
    'Artistic Print': 'Sanatsal Baskı', 'Sanatsal Baskı': 'Sanatsal Baskı',
    'Written by': 'Söz', 'Produced by': 'Yapımcı', 'Yapımcı': 'Yapımcı',
    'Composer': 'Besteci', 'Compositore': 'Besteci',
    'Artist': 'Sanatçı', 'Artista': 'Sanatçı',
  },
  it: {
    'Song': 'Brano', 'Şarkı': 'Brano', 'Brano': 'Brano', 'Parça': 'Brano',
    'Composed by': 'Compositore', 'Beste': 'Compositore', 'Besteci': 'Compositore',
    'Lyrics': 'Testi', 'Söz': 'Testi', 'Testi': 'Testi', 'Söz ve Müzik': 'Testi e Musica',
    'Music': 'Musica', 'Müzik': 'Musica', 'Musica': 'Musica',
    'Arranged by': 'Arrangiamento', 'Düzenleme': 'Arrangiamento', 'Arrangiamento': 'Arrangiamento',
    'Pianocover': 'Cover per piano', 'Pianocover by': 'Cover per piano',
    'Piano arrangement': 'Arrangiamento per pianoforte', 'Cover per piano': 'Cover per piano',
    'Painting by': 'Dipinto di', 'Tablo': 'Dipinto di', 'Ressam': 'Dipinto di',
    'Digital Art': 'Arte digitale', 'Digital Art by': 'Arte digitale',
    'Art Gallery': 'Galleria d\'arte', 'Sanat Galerisi': 'Galleria d\'arte',
    'Video Recording & Post Production': 'Registrazione video e post produzione',
    'Video Kayıt & Kurgu': 'Registrazione video e post produzione',
    'Video recording & Post production': 'Registrazione video e post produzione',
    'Video & Post Production': 'Video e post produzione',
    'Violin': 'Violino', 'Violino': 'Violino',
    'Artistic Print': 'Stampa artistica', 'Sanatsal Baskı': 'Stampa artistica',
    'Written by': 'Scritto da', 'Produced by': 'Prodotto da', 'Yapımcı': 'Prodotto da',
    'Composer': 'Compositore', 'Compositore': 'Compositore',
    'Artist': 'Artista', 'Artista': 'Artista',
  },
};

/**
 * Translate a credit line's label to the target language.
 * @param {string} creditLine - e.g. "Composed by: Hans Zimmer"
 * @param {string} targetLang - 'en', 'tr', or 'it'
 * @returns {string}
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

/**
 * Translate a full video description for a target locale.
 *
 * Strategy:
 * 1. Split into prose, credits, hashtags, piano line
 * 2. Translate the prose text using MyMemory API
 * 3. Translate credit labels using our dictionary
 * 4. Reassemble with original hashtags and piano line
 *
 * @param {string} description - Raw YouTube description
 * @param {string} targetLang - 'en', 'tr', or 'it'
 * @returns {Promise<string>} Translated description
 */
export async function translateDescription(description, targetLang) {
  if (!description || !description.trim()) return description;

  const { prose, credits, hashtags, pianoLine } = splitDescription(description);

  // Detect source language
  const sourceLang = isTurkish(prose) ? 'tr' : 'en';

  // Translate prose
  let translatedProse = prose;
  if (prose && sourceLang !== targetLang) {
    try {
      translatedProse = await translateText(prose, sourceLang, targetLang);
    } catch (err) {
      console.warn(`[translator] Failed to translate prose: ${err.message}`);
      translatedProse = prose; // fallback to original
    }
  }

  // Translate credit labels
  const translatedCredits = credits.map(line => translateCreditLabel(line, targetLang));

  // Reassemble
  const parts = [];
  if (translatedProse) parts.push(translatedProse);
  if (translatedCredits.length > 0) parts.push(translatedCredits.join('\n'));
  if (hashtags) parts.push('\n' + hashtags);
  if (pianoLine) parts.push(pianoLine);

  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Translate descriptions for multiple new videos into all three locales.
 *
 * @param {Array<{videoId: string, description: string}>} newVideos
 * @returns {Promise<{en: Object, tr: Object, it: Object}>} Maps of videoId → translated description
 */
export async function translateNewVideoDescriptions(newVideos) {
  const results = { en: {}, tr: {}, it: {} };

  for (const video of newVideos) {
    const { videoId, description } = video;
    if (!description) continue;

    console.log(`[translator] Translating description for "${video.title || videoId}"...`);

    // Translate to each locale (with small delays to respect rate limits)
    for (const lang of ['en', 'tr', 'it']) {
      try {
        results[lang][videoId] = await translateDescription(description, lang);
        // Small delay between API calls to be respectful
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.warn(`[translator] Error translating ${videoId} to ${lang}:`, err.message);
        results[lang][videoId] = description; // fallback to original
      }
    }
  }

  return results;
}
