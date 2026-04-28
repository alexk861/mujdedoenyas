/**
 * One-time backfill: clean up ALL existing video descriptions in locale files.
 *
 * - EN: extract English-only prose, strip Turkish, strip spam/hashtags
 * - TR: extract Turkish-only prose, strip English, strip spam/hashtags
 * - IT: translate English prose → Italian via MyMemory API
 * - All: translate credit labels via dictionary
 *
 * Usage: node scripts/backfill-translations.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Paths ──────────────────────────────────────────────────────────────────────

const VIDEOS_PATH = join(ROOT, 'src/data/videos.json');
const LOCALE_PATHS = {
  en: join(ROOT, 'src/locales/en.json'),
  tr: join(ROOT, 'src/locales/tr.json'),
  it: join(ROOT, 'src/locales/it.json'),
};

// ── Subscribe / spam patterns ──────────────────────────────────────────────────

const SPAM_PATTERNS = [
  /subscribe/i, /abone/i, /follow.*new.*video/i, /yeni.*video.*takip/i,
  /kanalım/i, /channel/i, /like.*share/i, /beğen.*paylaş/i,
  /notification.*bell/i, /bildiri.*zil/i, /follow.*journey/i,
  /yolculuğ.*takip/i, /invitation.*resonances/i, /gelecek.*rezonans/i,
  /Would you like to follow/i, /Yeni videoları takip/i,
  /An invitation to experience/i,
];

function isSpamLine(line) {
  return SPAM_PATTERNS.some(p => p.test(line));
}

// ── Language detection ─────────────────────────────────────────────────────────

const TR_CHARS = /[çÇğĞıİşŞ]/g;
const TR_WORDS = /\b(ve|bir|bu|için|ile|olan|olarak|yazılan|eser|aşk|bayram|kutlu|tablo|ressam|sanat|söz|müzik|beste|düzenleme|şarkı|piyano|zamanla|hatıra|silinen|taşır|ölümsüz|türkü|yolunda|kalbin|duygu|sevgi|özlem)\b/gi;

function isTurkishLine(text) {
  if (!text || text.trim().length < 5) return false;
  const charHits = (text.match(TR_CHARS) || []).length;
  const wordHits = (text.match(TR_WORDS) || []).length;
  return charHits >= 2 || wordHits >= 2;
}

// ── Credit label dictionary ────────────────────────────────────────────────────

const LABELS = {
  en: {
    'Şarkı': 'Song', 'Parça': 'Piece', 'Beste': 'Composed by', 'Besteci': 'Composer',
    'Söz': 'Lyrics', 'Söz ve Müzik': 'Lyrics & Music', 'Müzik': 'Music',
    'Düzenleme': 'Arranged by', 'Tablo': 'Painting by', 'Ressam': 'Painting by',
    'Sanat Galerisi': 'Art Gallery', 'Video Kayıt & Kurgu': 'Video Recording & Post Production',
    'Keman': 'Violin', 'Sanatsal Baskı': 'Artistic Print', 'Yapımcı': 'Produced by',
    'Sanatçı': 'Artist', 'Seramik sanatçısı': 'Ceramic Artist',
    'Piyano düzenleme': 'Piano arrangement',
    'Video ve post prodüksiyon': 'Video Recording & Post Production',
  },
  tr: {
    'Song': 'Şarkı', 'Piece': 'Parça', 'Composed by': 'Beste', 'Composer': 'Besteci',
    'Lyrics': 'Söz', 'Lyrics & Music': 'Söz ve Müzik', 'Music': 'Müzik',
    'Arranged by': 'Düzenleme', 'Painting by': 'Tablo',
    'Art Gallery': 'Sanat Galerisi', 'Video Recording & Post Production': 'Video Kayıt & Kurgu',
    'Video recording & Post production': 'Video Kayıt & Kurgu',
    'Video & Post Production': 'Video & Kurgu', 'Violin': 'Keman',
    'Artistic Print': 'Sanatsal Baskı', 'Produced by': 'Yapımcı',
    'Artist': 'Sanatçı', 'Ceramic Artist': 'Seramik sanatçısı',
    'Piano cover': 'Piyano düzenleme', 'Piano cover by': 'Piyano düzenleme',
    'Piano arrangement': 'Piyano düzenleme', 'Piano Cover by': 'Piyano düzenleme',
    'Pianocover': 'Piyano düzenleme', 'Pianocover by': 'Piyano düzenleme',
    'Written by': 'Söz', 'Digital Art': 'Dijital Sanat', 'Digital Art by': 'Dijital Sanat',
    'Fine Art Photograph': 'Güzel Sanat Fotoğrafı',
    'Kaftan designed by': 'Kaftan tasarım',
  },
  it: {
    'Song': 'Brano', 'Şarkı': 'Brano', 'Piece': 'Brano', 'Parça': 'Brano',
    'Composed by': 'Compositore', 'Beste': 'Compositore', 'Composer': 'Compositore', 'Besteci': 'Compositore',
    'Lyrics': 'Testi', 'Söz': 'Testi', 'Lyrics & Music': 'Testi e Musica', 'Söz ve Müzik': 'Testi e Musica',
    'Music': 'Musica', 'Müzik': 'Musica',
    'Arranged by': 'Arrangiamento', 'Düzenleme': 'Arrangiamento',
    'Painting by': 'Dipinto di', 'Tablo': 'Dipinto di', 'Ressam': 'Dipinto di',
    'Art Gallery': 'Galleria d\'arte', 'Sanat Galerisi': 'Galleria d\'arte',
    'Video Recording & Post Production': 'Registrazione video e post produzione',
    'Video recording & Post production': 'Registrazione video e post produzione',
    'Video & Post Production': 'Video e post produzione',
    'Video Kayıt & Kurgu': 'Registrazione video e post produzione',
    'Violin': 'Violino', 'Keman': 'Violino',
    'Artistic Print': 'Stampa artistica', 'Sanatsal Baskı': 'Stampa artistica',
    'Produced by': 'Prodotto da', 'Yapımcı': 'Prodotto da',
    'Written by': 'Scritto da', 'Artist': 'Artista', 'Sanatçı': 'Artista',
    'Piano cover': 'Cover per piano', 'Piano cover by': 'Cover per piano',
    'Piano Cover by': 'Cover per piano', 'Piano arrangement': 'Arrangiamento per pianoforte',
    'Pianocover': 'Cover per piano', 'Pianocover by': 'Cover per piano',
    'Digital Art': 'Arte digitale', 'Digital Art by': 'Arte digitale',
    'Fine Art Photograph': 'Fotografia d\'arte',
    'Ceramic Artist': 'Artista ceramista', 'Seramik sanatçısı': 'Artista ceramista',
    'Kaftan designed by': 'Caftano disegnato da',
    'Composer(s)': 'Compositori',
    'Piyano düzenleme': 'Arrangiamento per pianoforte',
  },
};

function translateLabel(creditLine, targetLang) {
  const m = creditLine.match(/^(.+?):\s*(.+)$/);
  if (!m) return creditLine;
  const label = m[1].trim();
  const value = m[2].trim();
  const map = LABELS[targetLang] || {};
  return `${map[label] || label}: ${value}`;
}

// ── Description parser ─────────────────────────────────────────────────────────

function parseDescription(desc) {
  if (!desc) return { trProse: '', enProse: '', credits: [], pianoLine: '' };

  const lines = desc.split('\n');
  const proseLines = [];
  const credits = [];
  let pianoLine = '';

  for (const line of lines) {
    const t = line.trim();
    if (!t) { proseLines.push(''); continue; }
    if (t.startsWith('🎹')) { pianoLine = t; continue; }
    if (t.startsWith('#') || (t.includes('#') && t.split('#').length > 3)) continue;
    if (isSpamLine(t)) continue;

    // Credit: "Label: Value" — short label
    const cm = t.match(/^([A-Za-zÀ-ÿçÇğĞıİöÖşŞüÜ\s&'().]{2,45}):\s*(.+)$/);
    if (cm && !t.includes('"') && !t.includes('\u201c') && !t.includes('?') && !/\.\s/.test(cm[1])) {
      credits.push(t);
      continue;
    }

    proseLines.push(line);
  }

  // Split prose into TR/EN paragraphs
  const text = proseLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const paras = text.split(/\n\s*\n/).filter(p => p.trim());

  const trParas = [];
  const enParas = [];

  for (const p of paras) {
    if (isTurkishLine(p)) {
      trParas.push(p.trim());
    } else {
      enParas.push(p.trim());
    }
  }

  return {
    trProse: trParas.join('\n\n'),
    enProse: enParas.join('\n\n'),
    credits,
    pianoLine,
  };
}

// ── MyMemory API ───────────────────────────────────────────────────────────────

async function translateText(text, from, to) {
  if (!text || !text.trim() || from === to) return text;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  if (!res.ok) return text;

  const data = await res.json();
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    const tr = data.responseData.translatedText;
    if (tr === tr.toUpperCase() && text !== text.toUpperCase()) return text;
    return tr;
  }
  return text;
}

// ── Assemble clean description ─────────────────────────────────────────────────

function assemble(prose, credits, pianoLine, lang) {
  const parts = [];
  if (prose) parts.push(prose);
  if (credits.length) parts.push(credits.map(c => translateLabel(c, lang)).join('\n'));
  if (pianoLine) parts.push(pianoLine);
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const videos = JSON.parse(readFileSync(VIDEOS_PATH, 'utf-8'));
  const locales = {};
  for (const [lang, path] of Object.entries(LOCALE_PATHS)) {
    locales[lang] = JSON.parse(readFileSync(path, 'utf-8'));
  }

  console.log(`Processing ${videos.length} videos...\n`);

  let itTranslateCount = 0;

  for (const video of videos) {
    const id = video.videoId;
    // Use the raw description from videos.json as the source of truth
    const rawDesc = video.description || '';

    // Also check existing locale descriptions — use the longest available
    const existingEN = locales.en.archive?.videoDescriptions?.[id] || '';
    const existingTR = locales.tr.archive?.videoDescriptions?.[id] || '';

    // Parse the best available description
    const sourceDesc = rawDesc.length > existingEN.length ? rawDesc : (existingEN || rawDesc);
    const { trProse, enProse, credits, pianoLine } = parseDescription(sourceDesc);

    // EN locale: English prose only
    const enClean = assemble(enProse || trProse, credits, pianoLine, 'en');

    // TR locale: Turkish prose only (fallback to EN prose if no TR found)
    let trClean;
    if (trProse) {
      trClean = assemble(trProse, credits, pianoLine, 'tr');
    } else {
      // No Turkish text found — use English (some descriptions are English-only)
      trClean = assemble(enProse, credits, pianoLine, 'tr');
    }

    // IT locale: translate English prose to Italian
    let itProse = enProse || trProse;
    if (itProse && itTranslateCount < 40) {
      try {
        const fromLang = enProse ? 'en' : 'tr';
        console.log(`  [IT] Translating ${id} (${fromLang} → it)...`);
        itProse = await translateText(itProse, fromLang, 'it');
        itTranslateCount++;
        // Rate limit: wait 500ms between API calls
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.warn(`  [IT] Failed for ${id}: ${e.message}`);
      }
    }
    const itClean = assemble(itProse, credits, pianoLine, 'it');

    // Ensure structure exists
    if (!locales.en.archive) locales.en.archive = {};
    if (!locales.en.archive.videoDescriptions) locales.en.archive.videoDescriptions = {};
    if (!locales.tr.archive) locales.tr.archive = {};
    if (!locales.tr.archive.videoDescriptions) locales.tr.archive.videoDescriptions = {};
    if (!locales.it.archive) locales.it.archive = {};
    if (!locales.it.archive.videoDescriptions) locales.it.archive.videoDescriptions = {};

    // Write
    locales.en.archive.videoDescriptions[id] = enClean;
    locales.tr.archive.videoDescriptions[id] = trClean;
    locales.it.archive.videoDescriptions[id] = itClean;

    console.log(`✓ ${id} — EN: ${enClean.length}c, TR: ${trClean.length}c, IT: ${itClean.length}c`);
  }

  // Save
  for (const [lang, path] of Object.entries(LOCALE_PATHS)) {
    writeFileSync(path, JSON.stringify(locales[lang], null, 2) + '\n', 'utf-8');
    console.log(`\n✓ Saved ${lang}.json`);
  }

  console.log(`\nDone! Translated ${itTranslateCount} descriptions to Italian.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
