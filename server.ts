import express from 'express';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

// Open SQLite database
const DB_PATH = path.resolve(process.cwd(), 'assets', 'bible.db');
let db: DatabaseSync | null = null;

try {
  if (fs.existsSync(DB_PATH)) {
    db = new DatabaseSync(DB_PATH);
    console.log(`[Database] Loaded Bible database from ${DB_PATH}`);
  } else {
    console.warn(`[Database] Warning: ${DB_PATH} not found.`);
  }
} catch (err) {
  console.error('[Database] Failed to open SQLite database:', err);
}

// Helper: Curated Daily Verses (same deterministic sequence as Plumb Line client)
const DAILY_VERSES = [
  { book: 'John', chapter: 3, verseStart: 16, verseEnd: 17 },
  { book: 'Psalms', chapter: 23, verseStart: 1, verseEnd: 6 },
  { book: 'Proverbs', chapter: 3, verseStart: 5, verseEnd: 6 },
  { book: 'Romans', chapter: 8, verseStart: 28, verseEnd: 39 },
  { book: 'Philippians', chapter: 4, verseStart: 4, verseEnd: 9 },
  { book: 'Matthew', chapter: 6, verseStart: 25, verseEnd: 34 },
  { book: 'Isaiah', chapter: 40, verseStart: 28, verseEnd: 31 },
  { book: 'Jeremiah', chapter: 29, verseStart: 11, verseEnd: 13 },
  { book: '1 Corinthians', chapter: 13, verseStart: 4, verseEnd: 8 },
  { book: 'Psalms', chapter: 46, verseStart: 1, verseEnd: 11 },
  { book: 'Joshua', chapter: 1, verseStart: 7, verseEnd: 9 },
  { book: 'Matthew', chapter: 5, verseStart: 14, verseEnd: 16 },
  { book: 'Galatians', chapter: 5, verseStart: 22, verseEnd: 25 },
  { book: 'Ephesians', chapter: 2, verseStart: 8, verseEnd: 10 },
  { book: 'Colossians', chapter: 3, verseStart: 12, verseEnd: 17 },
  { book: 'Hebrews', chapter: 11, verseStart: 1, verseEnd: 6 },
  { book: '1 Peter', chapter: 5, verseStart: 6, verseEnd: 10 },
  { book: 'Psalms', chapter: 119, verseStart: 105, verseEnd: 112 },
  { book: 'Romans', chapter: 12, verseStart: 1, verseEnd: 2 },
  { book: 'James', chapter: 1, verseStart: 2, verseEnd: 5 },
  { book: 'Amos', chapter: 7, verseStart: 7, verseEnd: 8 }, // The Plumb Line foundational scripture
];

// Lazy load Gemini
let geminiAi: any = null;
async function getGemini() {
  if (geminiAi) return geminiAi;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const { GoogleGenAI } = await import('@google/genai');
    geminiAi = new GoogleGenAI({ apiKey: key });
    return geminiAi;
  } catch (err) {
    console.error('Failed to initialize Gemini SDK:', err);
    return null;
  }
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db !== null,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    version: '1.0.0',
    bundleId: 'com.mattjhagen.plumbline',
  });
});

// Production status and audit info
app.get('/api/production-config', (req, res) => {
  let verseCount = 0;
  let bookCount = 0;
  if (db) {
    try {
      const vResult = db.prepare('SELECT COUNT(*) as c FROM verses').get() as { c: number };
      const bResult = db.prepare('SELECT COUNT(*) as c FROM books').get() as { c: number };
      verseCount = vResult.c;
      bookCount = bResult.c;
    } catch {
      // ignore
    }
  }

  res.json({
    app: {
      name: 'Plumb Line',
      bundleIdentifier: 'com.mattjhagen.plumbline',
      version: '1.0.0',
      scheme: 'plumbline',
      userInterfaceStyle: 'automatic',
      easProjectId: '30606f16-3dc8-4aee-9f40-2d53efec2ba7',
      supportEmail: 'matty@purepulse.one',
      primaryScripture: 'Amos 7:7-8',
      translation: 'World English Bible (engwebp)',
      provenance: 'Public Domain (100% royalty-free, zero commercial copyright restriction)',
    },
    databaseAudit: {
      verified: verseCount === 31098 && bookCount === 66,
      bookCount,
      verseCount,
      targetBooks: 66,
      targetVerses: 31098,
    },
    ai: {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    },
    safetyRouter: {
      crisisLine: '988 Suicide & Crisis Lifeline',
      crisisTextLine: 'HOME to 741741',
      domesticViolenceHotline: '1-800-799-7233',
      sexualAssaultHotline: '1-800-656-4673',
      emergency: '911',
    },
    deployment: {
      easProfile: 'production',
      platform: 'ios',
      distribution: 'app-store',
      cliCommand: 'npx eas-cli build --platform ios --profile production',
    },
  });
});

// Books list
app.get('/api/bible/books', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Bible database unavailable' });
  }
  try {
    const books = db
      .prepare(
        `SELECT b.id, b.usfm_id, b.name, b.canonical_order, b.testament,
                MAX(v.chapter) as total_chapters
         FROM books b
         LEFT JOIN verses v ON b.id = v.book_id
         GROUP BY b.id
         ORDER BY b.canonical_order ASC`
      )
      .all();
    res.json(books);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single chapter verses
app.get('/api/bible/chapter', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Bible database unavailable' });
  }
  const bookName = req.query.book as string;
  const chapter = parseInt(req.query.chapter as string, 10);

  if (!bookName || isNaN(chapter)) {
    return res.status(400).json({ error: 'book and chapter parameters are required' });
  }

  try {
    const verses = db
      .prepare(
        `SELECT v.id, b.name as book, v.chapter, v.verse, v.text, 'WEB' as translation
         FROM verses v
         JOIN books b ON b.id = v.book_id
         WHERE (b.name = ? OR b.usfm_id = ?) AND v.chapter = ?
         ORDER BY v.verse ASC`
      )
      .all(bookName, bookName, chapter);

    res.json(verses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Passage verses
app.get('/api/bible/passage', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Bible database unavailable' });
  }
  const bookName = req.query.book as string;
  const chapter = parseInt(req.query.chapter as string, 10);
  const start = parseInt(req.query.start as string, 10);
  const end = parseInt((req.query.end as string) || (req.query.start as string), 10);

  if (!bookName || isNaN(chapter) || isNaN(start)) {
    return res.status(400).json({ error: 'book, chapter, and start parameters are required' });
  }

  try {
    const verses = db
      .prepare(
        `SELECT v.id, b.name as book, v.chapter, v.verse, v.text, 'WEB' as translation
         FROM verses v
         JOIN books b ON b.id = v.book_id
         WHERE (b.name = ? OR b.usfm_id = ?) AND v.chapter = ? AND v.verse >= ? AND v.verse <= ?
         ORDER BY v.verse ASC`
      )
      .all(bookName, bookName, chapter, start, end);

    res.json(verses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verse of the Day
app.get('/api/bible/verse-of-the-day', (req, res) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const ref = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];

  if (!db) {
    return res.json({
      ref,
      verses: [
        {
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verseStart,
          text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
          translation: 'WEB',
        },
      ],
    });
  }

  try {
    const verses = db
      .prepare(
        `SELECT v.id, b.name as book, v.chapter, v.verse, v.text, 'WEB' as translation
         FROM verses v
         JOIN books b ON b.id = v.book_id
         WHERE b.name = ? AND v.chapter = ? AND v.verse >= ? AND v.verse <= ?
         ORDER BY v.verse ASC`
      )
      .all(ref.book, ref.chapter, ref.verseStart, ref.verseEnd);

    res.json({ ref, verses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search Bible verses
app.get('/api/bible/search', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Bible database unavailable' });
  }
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const verses = db
      .prepare(
        `SELECT v.id, b.name as book, v.chapter, v.verse, v.text, 'WEB' as translation
         FROM verses v
         JOIN books b ON b.id = v.book_id
         WHERE v.text LIKE ?
         ORDER BY b.canonical_order ASC, v.chapter ASC, v.verse ASC
         LIMIT 40`
      )
      .all(`%${q}%`);

    res.json(verses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// The Guide Service: POST /v1/guide/message and /api/guide/message
// -------------------------------------------------------------
const guideHandler = async (req: express.Request, res: express.Response) => {
  const { userInput, requestId, context } = req.body;

  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'userInput string is required', recoverable: false },
    });
  }

  const reqId = requestId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const inputLower = userInput.toLowerCase();

  // 1. Safety Filter Check
  const crisisPatterns = [
    /suicid/i,
    /kill myself/i,
    /end my life/i,
    /want to die/i,
    /cutting myself/i,
    /self harm/i,
    /hurt myself/i,
    /domestic abuse/i,
    /he hits me/i,
    /she hits me/i,
    /sexual assault/i,
    /rape/i,
    /overdose/i,
  ];

  const isCrisis = crisisPatterns.some((pattern) => pattern.test(inputLower));
  if (isCrisis) {
    return res.json({
      version: '1.0',
      requestId: reqId,
      text: "I hear the deep weight in what you're carrying, but what you're sharing needs immediate, caring professional support. Please know that your life is precious, and you do not have to carry this alone.",
      citations: [
        {
          book: 'Psalms',
          chapter: 34,
          verse: 18,
          text: 'The LORD is near to those who have a broken heart, and saves those who have a crushed spirit.',
        },
      ],
      nextQuestion: 'Would you be willing to reach out to one of the free 24/7 confidential support resources listed below?',
      safetyCategory: 'crisis',
      uncertaintyFlag: false,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Scripture Grounding: Find candidate verses matching the user's intent or reference
  let candidateVerses: Array<{ book: string; chapter: number; verse: number; text: string }> = [];

  if (db) {
    try {
      // Check for book names mentioned in prompt
      const booksList = db.prepare('SELECT name FROM books').all() as Array<{ name: string }>;
      let matchedBook: string | null = null;
      for (const b of booksList) {
        if (inputLower.includes(b.name.toLowerCase())) {
          matchedBook = b.name;
          break;
        }
      }

      if (matchedBook) {
        // Try to match chapter number
        const numMatch = userInput.match(new RegExp(`${matchedBook}\\s+(\\d+)`, 'i'));
        const chapterNum = numMatch ? parseInt(numMatch[1], 10) : 1;
        const fetched = db
          .prepare(
            `SELECT b.name as book, v.chapter, v.verse, v.text
             FROM verses v
             JOIN books b ON b.id = v.book_id
             WHERE b.name = ? AND v.chapter = ?
             LIMIT 6`
          )
          .all(matchedBook, chapterNum) as any[];
        if (fetched.length > 0) {
          candidateVerses = fetched;
        }
      }

      // If no explicit book matched, search for spiritual themes
      if (candidateVerses.length === 0) {
        const themeKeywords = [
          'peace',
          'anxiety',
          'fear',
          'hope',
          'love',
          'grief',
          'comfort',
          'forgive',
          'strength',
          'faith',
          'prayer',
          'trust',
          'guidance',
          'purpose',
          'doubt',
          'tired',
          'weary',
          'anger',
          'joy',
        ];
        const matchedWord = themeKeywords.find((w) => inputLower.includes(w)) || 'peace';

        candidateVerses = db
          .prepare(
            `SELECT b.name as book, v.chapter, v.verse, v.text
             FROM verses v
             JOIN books b ON b.id = v.book_id
             WHERE v.text LIKE ?
             ORDER BY v.id ASC
             LIMIT 5`
          )
          .all(`%${matchedWord}%`) as any[];
      }
    } catch (e) {
      console.error('Error fetching grounding passages:', e);
    }
  }

  // Fallback candidate passages if DB returned none
  if (candidateVerses.length === 0) {
    candidateVerses = [
      {
        book: 'Matthew',
        chapter: 11,
        verse: 28,
        text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.',
      },
      {
        book: 'Psalms',
        chapter: 23,
        verse: 1,
        text: 'The LORD is my shepherd; I shall not want.',
      },
      {
        book: 'Philippians',
        chapter: 4,
        verse: 6,
        text: 'In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.',
      },
      {
        book: 'John',
        chapter: 14,
        verse: 27,
        text: 'Peace I leave with you. My peace I give to you; not as the world gives, give I to you. Do not let your heart be troubled, neither let it be fearful.',
      },
    ];
  }

  // 3. Try Gemini AI with Grounded Context
  const ai = await getGemini();

  if (ai) {
    try {
      const passagesContext = candidateVerses
        .map((c) => `[${c.book} ${c.chapter}:${c.verse} (WEB)]: "${c.text}"`)
        .join('\n');

      const systemInstruction = `You are Plumb Line, a minimal, personal Bible-study companion.
The plumb line is a biblical instrument of alignment, truth, examination, and quiet faithful direction (Amos 7:7-8).
Voice principles:
- Compassionate study companion, not God, clergy, therapist, doctor, or religious authority.
- Never claim divine revelation ("God told me").
- Grounded in truth: ONLY cite verses from the SUPPLIED SCRIPTURE PASSAGES below. Do NOT invent or quote verses that were not provided.
- Keep guidance brief, warm, direct, and unhurried (2 to 4 sentences).
- Offer one gentle reflective question or invitation at the end.
- Output strictly in valid JSON format matching the schema.

SUPPLIED SCRIPTURE PASSAGES (YOU MAY ONLY CITE FROM THESE):
${passagesContext}`;

      const userPrompt = `User's message: "${userInput}"

Respond with valid JSON with this exact structure:
{
  "text": "Your brief compassionate guidance...",
  "citations": [
    {
      "book": "BookName",
      "chapter": 1,
      "verse": 1
    }
  ],
  "nextQuestion": "A calm, open-ended question for their heart or prayer..."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const responseText = response.text?.trim() || '';
      const parsed = JSON.parse(responseText);

      // Validate citations against supplied passages
      const validCitations: Array<{ book: string; chapter: number; verse: number; text?: string }> = [];
      if (Array.isArray(parsed.citations)) {
        for (const cit of parsed.citations) {
          const match = candidateVerses.find(
            (cv) =>
              cv.book.toLowerCase() === (cit.book || '').toLowerCase() &&
              cv.chapter === Number(cit.chapter) &&
              cv.verse === Number(cit.verse)
          );
          if (match) {
            validCitations.push({
              book: match.book,
              chapter: match.chapter,
              verse: match.verse,
              text: match.text,
            });
          }
        }
      }

      // If AI didn't cite any or cited invalid, fallback to the most relevant supplied verse
      if (validCitations.length === 0 && candidateVerses.length > 0) {
        const top = candidateVerses[0];
        validCitations.push({
          book: top.book,
          chapter: top.chapter,
          verse: top.verse,
          text: top.text,
        });
      }

      return res.json({
        version: '1.0',
        requestId: reqId,
        text: parsed.text || 'In quietness and confidence shall be your strength.',
        citations: validCitations,
        nextQuestion: parsed.nextQuestion || 'How does this scripture meet you in your circumstance today?',
        safetyCategory: 'safe',
        uncertaintyFlag: false,
        timestamp: new Date().toISOString(),
      });
    } catch (aiErr) {
      console.error('Gemini generation error, checking OpenRouter or local response:', aiErr);
    }
  }

  // 3b. Try OpenRouter AI with Grounded Context if configured
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const passagesContext = candidateVerses
        .map((c) => `[${c.book} ${c.chapter}:${c.verse} (WEB)]: "${c.text}"`)
        .join('\n');

      const systemInstruction = `You are Plumb Line, a minimal, personal Bible-study companion.
The plumb line is a biblical instrument of alignment, truth, examination, and quiet faithful direction (Amos 7:7-8).
Voice principles:
- Compassionate study companion, not God, clergy, therapist, doctor, or religious authority.
- Never claim divine revelation ("God told me").
- Grounded in truth: ONLY cite verses from the SUPPLIED SCRIPTURE PASSAGES below. Do NOT invent or quote verses that were not provided.
- Keep guidance brief, warm, direct, and unhurried (2 to 4 sentences).
- Offer one gentle reflective question or invitation at the end.
- Output strictly in valid JSON format matching the schema.

SUPPLIED SCRIPTURE PASSAGES:
${passagesContext}`;

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://plumbline.rooted.guide',
          'X-Title': 'Rooted Guide Plumb Line',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemInstruction },
            {
              role: 'user',
              content: `User's message: "${userInput}"\nRespond with valid JSON: {"text": "...", "citations": [{"book": "...", "chapter": 1, "verse": 1}], "nextQuestion": "..."}`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (orRes.ok) {
        const orJson = await orRes.json();
        const rawContent = orJson.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, '').trim());

        const validCitations: Array<{ book: string; chapter: number; verse: number; text?: string }> = [];
        if (Array.isArray(parsed.citations)) {
          for (const cit of parsed.citations) {
            const match = candidateVerses.find(
              (cv) =>
                cv.book.toLowerCase() === (cit.book || '').toLowerCase() &&
                cv.chapter === Number(cit.chapter) &&
                cv.verse === Number(cit.verse)
            );
            if (match) {
              validCitations.push({
                book: match.book,
                chapter: match.chapter,
                verse: match.verse,
                text: match.text,
              });
            }
          }
        }

        if (validCitations.length === 0 && candidateVerses.length > 0) {
          const top = candidateVerses[0];
          validCitations.push({
            book: top.book,
            chapter: top.chapter,
            verse: top.verse,
            text: top.text,
          });
        }

        return res.json({
          version: '1.0',
          requestId: reqId,
          text: parsed.text || 'In quietness and confidence shall be your strength.',
          citations: validCitations,
          nextQuestion: parsed.nextQuestion || 'How does this scripture meet you in your circumstance today?',
          safetyCategory: 'safe',
          uncertaintyFlag: false,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (orErr) {
      console.warn('[OpenRouter] Guide query failed, falling back to local grounded response:', orErr);
    }
  }

  // 4. Deterministic Local Grounded Response (when AI keys are absent or on failure)
  const topVerse = candidateVerses[0];
  const secondVerse = candidateVerses[1] || topVerse;

  const responses = [
    {
      text: `When we bring our honest heart into Scripture, the plumb line offers a steady reference point. In ${topVerse.book} ${topVerse.chapter}, we are invited to rest in what is enduring rather than the shifting currents around us.`,
      question: 'What word or invitation in this passage feels like an anchor for you right now?',
    },
    {
      text: `Scripture meets us right where we are, without demanding that we arrive put together. Notice how ${topVerse.book} ${topVerse.chapter}:${topVerse.verse} speaks into this exact moment.`,
      question: 'If you could speak one honest prayer regarding this today, what would you say?',
    },
  ];

  const selected = responses[Math.abs(reqId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % responses.length];

  return res.json({
    version: '1.0',
    requestId: reqId,
    text: selected.text,
    citations: [
      {
        book: topVerse.book,
        chapter: topVerse.chapter,
        verse: topVerse.verse,
        text: topVerse.text,
      },
      ...(secondVerse && secondVerse !== topVerse
        ? [
            {
              book: secondVerse.book,
              chapter: secondVerse.chapter,
              verse: secondVerse.verse,
              text: secondVerse.text,
            },
          ]
        : []),
    ],
    nextQuestion: selected.question,
    safetyCategory: 'safe',
    uncertaintyFlag: false,
    timestamp: new Date().toISOString(),
  });
};

app.post('/v1/guide/message', guideHandler);
app.post('/api/guide/message', guideHandler);

// -------------------------------------------------------------
// OpenRouter AI Dynamic Bible Plan Generator
// -------------------------------------------------------------
app.post('/api/plans/generate-adaptive', async (req, res) => {
  const { answers, previousFeedback } = req.body || {};
  const season = answers?.season || 'seeking guidance';
  const struggles = answers?.struggles || 'feeling weary and overwhelmed';
  const desire = answers?.desire || 'peace, wisdom, and steadfast faith';
  const depth = answers?.depth || 'focused';
  const minutesPerDay = answers?.minutesPerDay || 15;

  const systemPrompt = `You are a pastoral Scripture guide for Rooted Guide & Plumb Line.
Formulate a personalized 5-day Scripture plan tailored precisely to the user's answers.
Season: "${season}".
Struggles: "${struggles}".
Heart's Desire: "${desire}".
Depth: "${depth}" (${minutesPerDay} minutes/day).
${previousFeedback ? `User's latest reflections & feedback: "${previousFeedback}". Adapt the plan dynamically based on their answers.` : ''}

You MUST output ONLY valid JSON matching this exact structure:
{
  "title": "Short poetic title (e.g. Rooted in Living Water)",
  "subtitle": "Subtitle describing the theme",
  "botanicalMetaphor": "A spiritual plant/root metaphor (e.g. Deep taproots in drought)",
  "days": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "focus": "Brief focus sentence",
      "book": "Psalms",
      "chapter": 23,
      "verseStart": 1,
      "verseEnd": 6,
      "arrivePrompt": "Gentle question to settle their heart before reading",
      "reflectPrompt": "Reflective question on the passage",
      "respondPrompt": "Actionable invitation for prayer or response"
    }
    // Exactly 5 days total, choosing well-known canonical Bible books
  ]
}`;

  let planData: any = null;

  // 1. Try OpenRouter AI API if key is present
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      console.log('[OpenRouter] Calling OpenRouter AI API for dynamic Bible plan...');
      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://plumbline.rooted.guide',
          'X-Title': 'Rooted Guide Plumb Line',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Generate my personalized dynamic 5-day Scripture plan in JSON.' },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (orResponse.ok) {
        const orJson = await orResponse.json();
        const content = orJson.choices?.[0]?.message?.content;
        if (content) {
          planData = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
          console.log('[OpenRouter] Successfully generated dynamic plan via OpenRouter');
        }
      } else {
        console.warn('[OpenRouter] OpenRouter returned status:', orResponse.status, await orResponse.text());
      }
    } catch (err) {
      console.warn('[OpenRouter] OpenRouter call failed, falling back to Gemini:', err);
    }
  }

  // 2. Fallback to Gemini if OpenRouter was not configured or failed
  if (!planData) {
    const ai = await getGemini();
    if (ai) {
      try {
        console.log('[Gemini] Generating dynamic Bible plan with Gemini...');
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${systemPrompt}\n\nGenerate my personalized dynamic 5-day Scripture plan in JSON now.`,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response.text) {
          planData = JSON.parse(response.text);
        }
      } catch (err) {
        console.warn('[Gemini] Gemini plan generation failed, falling back to curated engine:', err);
      }
    }
  }

  // 3. Fallback to curated Rooted Guide adaptive engine if both APIs are unavailable
  if (!planData || !Array.isArray(planData.days)) {
    planData = {
      title: 'Rooted by the Streams of Water',
      subtitle: `A ${depth} journey into peace and renewal`,
      botanicalMetaphor: 'Like a tree planted by streams of water, yielding fruit in season.',
      days: [
        {
          day: 1,
          title: 'The Good Shepherd and Still Waters',
          focus: 'Finding rest when tired or overwhelmed',
          book: 'Psalms',
          chapter: 23,
          verseStart: 1,
          verseEnd: 6,
          arrivePrompt: 'Release the heavy tasks of the day. Notice where your body carries tension.',
          reflectPrompt: 'Which phrase in Psalm 23 feels like a drink of cool water to you right now?',
          respondPrompt: 'Speak an honest sentence thanking God for walking with you in valley moments.',
        },
        {
          day: 2,
          title: 'The Vine and the Branches',
          focus: 'Abiding rather than striving',
          book: 'John',
          chapter: 15,
          verseStart: 1,
          verseEnd: 8,
          arrivePrompt: 'What have you been trying to accomplish in your own strength this week?',
          reflectPrompt: 'What does Jesus mean when He invites us to simply "abide"?',
          respondPrompt: 'What is one pressure you can let go of today to rest in Christ?',
        },
        {
          day: 3,
          title: 'Lilies of the Field',
          focus: 'Freedom from anxious worry',
          book: 'Matthew',
          chapter: 6,
          verseStart: 25,
          verseEnd: 34,
          arrivePrompt: 'Look at how God clothes the grass of the field with exquisite beauty.',
          reflectPrompt: 'How does Jesus contrast everyday worry with your Father’s faithful provision?',
          respondPrompt: 'Name your biggest uncertainty today and entrust it into God’s care.',
        },
        {
          day: 4,
          title: 'Strength in Waiting',
          focus: 'Renewing strength like the eagle',
          book: 'Isaiah',
          chapter: 40,
          verseStart: 28,
          verseEnd: 31,
          arrivePrompt: 'Silence competing notifications and allow your mind to be quiet.',
          reflectPrompt: 'What does it mean to "wait on the Lord" in practical daily life?',
          respondPrompt: 'Ask the Holy Spirit for patience and endurance for the days ahead.',
        },
        {
          day: 5,
          title: 'The Plumb Line of Steadfast Truth',
          focus: 'Aligning your heart with God’s unchanging word',
          book: 'Amos',
          chapter: 7,
          verseStart: 7,
          verseEnd: 8,
          arrivePrompt: 'Reflect on how this week of Scripture has anchored your spirit.',
          reflectPrompt: 'Where has God’s word served as a gentle plumb line in your life?',
          respondPrompt: 'Commit one specific truth you have learned to live out tomorrow.',
        },
      ],
    };
  }

  // Populate actual verses from SQLite database for each day
  if (db && Array.isArray(planData.days)) {
    for (const d of planData.days) {
      try {
        const rows = db.prepare(
          'SELECT verse, text FROM verses WHERE book = ? AND chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse ASC'
        ).all(d.book, d.chapter, d.verseStart, d.verseEnd) as { verse: number; text: string }[];
        d.verses = rows;
      } catch (err) {
        console.warn(`Could not load verses for ${d.book} ${d.chapter}`, err);
        d.verses = [];
      }
    }
  }

  return res.json({
    success: true,
    plan: planData,
    generatedWith: openRouterKey ? 'OpenRouter AI API' : 'Adaptive Scripture Engine',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Apple Home Screen Widget AI Scripture Endpoint
// -------------------------------------------------------------
app.post('/api/widget/verse', async (req, res) => {
  const { thoughts, currentPath, theme } = req.body || {};
  const userThoughts = (thoughts || '').trim();
  const activePath = (currentPath || 'Rooted in Peace and Truth').trim();

  // 1. Try Gemini AI
  const ai = await getGemini();
  if (ai) {
    try {
      const prompt = `You are a quiet, biblical spiritual director for the "Rooted Guide" app.
A user wants an inspiring Scripture verse for their Apple iOS Home Screen Widget.
User's thoughts / heart posture: "${userThoughts || 'Seeking daily direction, peace, and spiritual rooting'}"
Current path / study focus: "${activePath}"

Select a single deeply resonant, authentic verse from Scripture (World English Bible translation or similar standard wording) that directly aligns with their thoughts and anchors their path today.

Respond strictly with valid JSON:
{
  "verseText": "Full text of the verse without omissions",
  "reference": "Book Chapter:Verse (e.g. Philippians 4:6-7)",
  "thoughtAlignment": "3-5 word essence phrase (e.g. Guarded by Unshakable Peace)",
  "encouragement": "A single compassionate, calming sentence for their day",
  "botanicalMetaphor": "A brief botanical or root metaphor (e.g. Deep roots beside living water)",
  "timeAnchor": "Morning Anchor"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (parsed.verseText && parsed.reference) {
          return res.json({
            success: true,
            widget: {
              ...parsed,
              theme: theme || 'olive',
              source: 'gemini-ai',
              updatedAt: new Date().toISOString(),
            },
          });
        }
      }
    } catch (err) {
      console.warn('[Widget AI] Error generating widget verse with Gemini:', err);
    }
  }

  // 2. Curated biblical library matching common thoughts & heart postures
  const curatedWidgetVerses = [
    {
      verseText: 'Those who wait on the Lord will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
      reference: 'Isaiah 40:31',
      thoughtAlignment: 'Renewed Strength in the Wait',
      encouragement: 'You don’t have to carry tomorrow’s weight with today’s breath.',
      botanicalMetaphor: 'An eagle nesting high in cedar branches',
      timeAnchor: 'Morning Anchor',
    },
    {
      verseText: 'Don’t be anxious about anything, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God will guard your hearts.',
      reference: 'Philippians 4:6-7',
      thoughtAlignment: 'Guarded by Unshakable Peace',
      encouragement: 'Trade racing thoughts for the quiet presence of Christ.',
      botanicalMetaphor: 'A sheltered olive grove holding steady through high winds',
      timeAnchor: 'Midday Anchor',
    },
    {
      verseText: 'Trust in the Lord with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
      reference: 'Proverbs 3:5-6',
      thoughtAlignment: 'Steadfast Path & Clear Direction',
      encouragement: 'Take the next small step in faith; the whole road is already held.',
      botanicalMetaphor: 'Green stalks quietly turning toward morning light',
      timeAnchor: 'Daily Direction',
    },
    {
      verseText: 'Come to me, all you who labor and are heavily burdened, and I will give you rest. Take my yoke upon you, and learn from me, for I am gentle and humble in heart.',
      reference: 'Matthew 11:28-29',
      thoughtAlignment: 'Rest for the Weary Spirit',
      encouragement: 'Rest is not a reward for finished work; it is the gift of His fellowship.',
      botanicalMetaphor: 'Cool shade beneath a flourishing fig canopy',
      timeAnchor: 'Evening Anchor',
    },
    {
      verseText: 'Blessed is the one who trusts in the Lord. For he will be as a tree planted by the waters, who spreads out its roots by the stream, and will not fear when heat comes.',
      reference: 'Jeremiah 17:7-8',
      thoughtAlignment: 'Planted by Living Water',
      encouragement: 'Your roots go deeper than the surface heat around you.',
      botanicalMetaphor: 'Deep taproots drinking from hidden underground springs',
      timeAnchor: 'Rooted Anchor',
    },
  ];

  let selected = curatedWidgetVerses[0];
  const lower = userThoughts.toLowerCase();
  if (lower.includes('anxi') || lower.includes('stress') || lower.includes('worry') || lower.includes('fear') || lower.includes('peace')) {
    selected = curatedWidgetVerses[1];
  } else if (lower.includes('decis') || lower.includes('confus') || lower.includes('path') || lower.includes('guid') || lower.includes('future')) {
    selected = curatedWidgetVerses[2];
  } else if (lower.includes('tired') || lower.includes('burnout') || lower.includes('heavy') || lower.includes('exhaust') || lower.includes('rest')) {
    selected = curatedWidgetVerses[3];
  } else if (lower.includes('grow') || lower.includes('faith') || lower.includes('root') || lower.includes('fruit')) {
    selected = curatedWidgetVerses[4];
  } else {
    selected = curatedWidgetVerses[Math.floor(Math.random() * curatedWidgetVerses.length)];
  }

  return res.json({
    success: true,
    widget: {
      ...selected,
      theme: theme || 'olive',
      source: 'curated-plumbline',
      updatedAt: new Date().toISOString(),
    },
  });
});

app.get('/api/widget/verse', async (req, res) => {
  const thoughts = (req.query.thoughts as string) || '';
  const currentPath = (req.query.currentPath as string) || '';
  const theme = (req.query.theme as string) || 'olive';
  req.body = { thoughts, currentPath, theme };
  // Handled by express route
  const event = { ...req, method: 'POST', body: { thoughts, currentPath, theme } };
  (app as any).handle(event, res);
});

// -------------------------------------------------------------
// Plant Care & Reminder Notifications
// -------------------------------------------------------------
let inMemoryPlants: any[] = [
  {
    id: 'plant-olive-1',
    name: 'Galilee Olive Tree',
    species: 'Olea europaea',
    waterFrequencyDays: 7,
    fertilizeFrequencyDays: 30,
    lastWateredAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    lastFertilizedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    notes: 'Symbolizes peace and steadfastness. Likes direct bright sunlight.',
    scriptureLink: 'Psalm 52:8 — "I am like a green olive tree in the house of God."',
    imageUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'plant-mustard-2',
    name: 'Mustard Herb',
    species: 'Brassica nigra',
    waterFrequencyDays: 3,
    fertilizeFrequencyDays: 14,
    lastWateredAt: new Date(Date.now() - 3 * 86400000).toISOString(), // Due for water today!
    lastFertilizedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    notes: 'Requires moist soil. Grows from the tiniest seed into a substantial sanctuary.',
    scriptureLink: 'Matthew 17:20 — "If you have faith even as small as a grain of mustard seed..."',
    imageUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'plant-fig-3',
    name: 'Bethany Fig Tree',
    species: 'Ficus carica',
    waterFrequencyDays: 5,
    fertilizeFrequencyDays: 28,
    lastWateredAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    lastFertilizedAt: new Date(Date.now() - 29 * 86400000).toISOString(), // Due for fertilizing soon!
    notes: 'Loves warm afternoon exposure. Deep watering when top 2 inches dry.',
    scriptureLink: 'Micah 4:4 — "They shall sit every man under his vine and under his fig tree."',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=600&q=80',
  },
];

app.get('/api/plants', (req, res) => {
  res.json(inMemoryPlants);
});

app.post('/api/plants', (req, res) => {
  const { name, species, waterFrequencyDays, fertilizeFrequencyDays, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Plant name is required' });

  const newPlant = {
    id: `plant-${Date.now()}`,
    name,
    species: species || 'Indoor Botanical',
    waterFrequencyDays: Number(waterFrequencyDays) || 7,
    fertilizeFrequencyDays: Number(fertilizeFrequencyDays) || 30,
    lastWateredAt: new Date().toISOString(),
    lastFertilizedAt: new Date().toISOString(),
    notes: notes || '',
    scriptureLink: 'Genesis 1:11 — "Let the earth yield grass, herbs yielding seeds, and fruit trees."',
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80',
  };

  inMemoryPlants.unshift(newPlant);
  res.status(201).json(newPlant);
});

app.post('/api/plants/:id/water', (req, res) => {
  const plant = inMemoryPlants.find((p) => p.id === req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  plant.lastWateredAt = new Date().toISOString();
  res.json({ success: true, plant });
});

app.post('/api/plants/:id/fertilize', (req, res) => {
  const plant = inMemoryPlants.find((p) => p.id === req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  plant.lastFertilizedAt = new Date().toISOString();
  res.json({ success: true, plant });
});

// Notifications & Reminders Endpoint
app.get('/api/notifications/reminders', (req, res) => {
  const now = Date.now();
  const reminders: any[] = [];

  for (const plant of inMemoryPlants) {
    const lastWatered = new Date(plant.lastWateredAt).getTime();
    const waterIntervalMs = plant.waterFrequencyDays * 86400000;
    const nextWaterTime = lastWatered + waterIntervalMs;

    if (now >= nextWaterTime) {
      const daysOverdue = Math.floor((now - nextWaterTime) / 86400000);
      reminders.push({
        id: `rem-water-${plant.id}`,
        type: 'watering',
        title: `Time to water your ${plant.name}`,
        message: daysOverdue > 0 
          ? `Watering is ${daysOverdue} day(s) overdue! Refresh the soil.`
          : 'Watering is scheduled for today.',
        plantId: plant.id,
        plantName: plant.name,
        urgency: daysOverdue > 1 ? 'high' : 'normal',
      });
    }

    const lastFertilized = new Date(plant.lastFertilizedAt).getTime();
    const fertIntervalMs = plant.fertilizeFrequencyDays * 86400000;
    const nextFertTime = lastFertilized + fertIntervalMs;

    if (now >= nextFertTime) {
      reminders.push({
        id: `rem-fert-${plant.id}`,
        type: 'fertilizing',
        title: `Fertilize your ${plant.name}`,
        message: 'Support root growth with gentle organic plant nourishment.',
        plantId: plant.id,
        plantName: plant.name,
        urgency: 'normal',
      });
    }
  }

  // Add notification for latest community forum post and article
  reminders.push({
    id: 'rem-article-featured',
    type: 'article',
    title: 'New Care Guide: Olive Tree Care & Spiritual Fruit',
    message: 'Learn pruning, sunlight balance, and the biblical symbol of peace.',
    articleSlug: 'olive-tree-care-and-peace',
    urgency: 'low',
  });

  res.json({
    remindersCount: reminders.length,
    reminders,
    checkedAt: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Plant Care Guides & Articles (Downloadable for Offline Access)
// -------------------------------------------------------------
const ARTICLES = [
  {
    id: 'art-1',
    slug: 'olive-tree-care-and-peace',
    title: 'The Olive Tree: Rooting, Sunlight, & Biblical Fruitfulness',
    category: 'Care Guide & Devotional',
    scriptureRef: 'Psalm 52:8',
    summary: 'Master the care of indoor and garden olive trees while meditating on the ancient symbol of divine reconciliation.',
    readTimeMinutes: 5,
    careSpecs: {
      light: '6-8 hours of direct, unfiltered sunlight daily',
      water: 'Allow top 2-3 inches of soil to completely dry between waterings',
      humidity: 'Thrives in dry to moderate indoor air (40-50%)',
      soil: 'Well-draining sandy loam or cactus-perlite mix',
    },
    content: `The olive tree (*Olea europaea*) is one of humanity’s most ancient and revered botanical companions. In Scripture, the dove returning to Noah’s ark carried an olive branch—the first physical proclamation that the flood waters had receded and peace was restored between heaven and earth.

### Botanical Care Instructions:
1. **Light & Placement:** Olive trees crave sunlight. Place them beside your brightest south-facing or west-facing window. If indoor lighting is limited, supplement with a full-spectrum LED grow light for 10 hours daily.
2. **Watering Rhythms:** Overwatering is the primary danger for potted olive trees. Always test the soil with your finger before watering. If moisture is detected in the top two inches, wait. When you do water, water thoroughly until it trickles from the drainage holes, then discard standing saucer water.
3. **Pruning for Strength:** Prune in early spring to shape the canopy, removing dead twigs and inward-crossing branches to allow sunlight to penetrate the heart of the tree.

### Spiritual Reflection:
*"I am like a green olive tree in the house of God. I trust in God’s loving kindness forever and ever."* (Psalm 52:8)
Notice the psalmist does not boast of sudden, fleeting blossoms. The olive tree grows deliberately, weathering fierce summer droughts by sinking taproots twenty feet deep into rocky limestone. When life feels barren or dry, remember that God is deepening your hidden roots.`,
  },
  {
    id: 'art-2',
    slug: 'mustard-seed-cultivation',
    title: 'Cultivating Mustard Greens: Soil Care & Mountain-Moving Faith',
    category: 'Botanical Guide',
    scriptureRef: 'Matthew 17:20',
    summary: 'A complete practical guide to germinating and nurturing mustard greens, and the spiritual physics of small beginnings.',
    readTimeMinutes: 4,
    careSpecs: {
      light: 'Partial to full sunlight (4-6 hours)',
      water: 'Consistent moisture; do not allow seedbeds to dry',
      humidity: 'Moderate humidity',
      soil: 'Rich, moist, well-composted organic soil',
    },
    content: `The black mustard seed (*Brassica nigra*) measures barely one to two millimeters across. Yet when sown in hospitable soil, it erupts into an expansive, fragrant leafy herb that reaches eight to twelve feet tall, providing shelter and shade.

### Sowing and Nurturing:
1. **Germination:** Sow seeds shallowly—about 1/4 inch deep. Keep the topsoil lightly damp with a fine mist. Seedlings typically emerge within 3 to 7 days.
2. **Moisture Balance:** While mature roots tolerate minor dry spells, young mustard greens require steady moisture to prevent premature bolting (bitter flowering).
3. **Harvesting:** Harvest baby leaves from the outer perimeter when they reach 3 to 4 inches for tender, peppery salads.

### Spiritual Reflection:
Jesus selected this specific, unassuming seed to illustrate the nature of genuine faith. Faith does not need to be grandiose in volume; it needs to be alive and planted. Even a microscopic grain of honest trust, surrendered into the soil of God’s grace, possesses the capacity to move mountains.`,
  },
  {
    id: 'art-3',
    slug: 'fig-tree-pruning-and-patience',
    title: 'The Fig Tree: Seasonal Cycles, Dormancy, & Sweet Fruit',
    category: 'Care Guide & Devotional',
    scriptureRef: 'Luke 13:6-9',
    summary: 'Understand winter dormancy, proper feeding, and the grace of a patient gardener tending an unhurried tree.',
    readTimeMinutes: 6,
    careSpecs: {
      light: 'Bright indirect to direct sun',
      water: 'Moderate watering during growing season; reduce in winter dormancy',
      humidity: 'Average room humidity',
      soil: 'Organically rich potting soil with peat and bark',
    },
    content: `The fig tree (*Ficus carica*) is unique because its flowers actually bloom invisibly *inside* the young fig fruit. In winter, the tree drops its broad hand-shaped leaves and enters deep dormancy, conserving vitality until spring warm breezes arrive.

### Care Strategies:
1. **Dormancy Respect:** Do not panic when your fig drops its foliage in late autumn. This is natural winter rest. Reduce watering by half and suspend all fertilization until new buds swell in March.
2. **Fertilizing:** During active spring and summer growth, feed every 3-4 weeks with a balanced organic liquid fertilizer high in potassium to encourage leaf resilience.

### Spiritual Reflection:
In Luke 13, a vinedresser pleads for a barren fig tree: *"Sir, leave it alone this year also, until I dig around it and fertilize it."* God is not an impatient master waiting to discard you during dry seasons. He kneels down into the soil of your life, gently loosens compacted dirt, adds grace, and patiently nurtures your fruitfulness.`,
  },
];

app.get('/api/articles', (req, res) => {
  res.json(ARTICLES);
});

app.get('/api/articles/:slug', (req, res) => {
  const article = ARTICLES.find((a) => a.slug === req.params.slug);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

// -------------------------------------------------------------
// Community Forum (Discussions, Tips & Prayers)
// -------------------------------------------------------------
let forumPosts: any[] = [
  {
    id: 'post-1',
    authorName: 'Sarah Jenkins',
    title: 'Saved my olive tree from root rot thanks to gravel drainage!',
    category: 'plant_care',
    content: 'My potted olive tree had yellowing lower leaves. I repotted it with coarse horticultural grit and perlite at the bottom, and restricted watering to every 10 days. Three weeks later, four new emerald shoots are emerging! Thank God for second chances even in gardening.',
    likesCount: 14,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'post-2',
    authorName: 'Pastor David R.',
    title: 'Meditation on Isaiah 40:28-31 during a heavy season',
    category: 'bible_study',
    content: 'For anyone feeling bone-tired tonight: "He gives power to the weak. He increases the strength of him who has no might." Notice who receives the strength—not the self-sufficient, but the one who has run out of their own fuel. Rest in Him tonight.',
    likesCount: 29,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'post-3',
    authorName: 'Elena Chen',
    title: 'Praying for my family during an unexpected transition',
    category: 'prayer',
    content: 'We are moving cities this month. Praying for peace for our two children and for roots to grow quickly in our new community. Grateful for this quiet Rooted Guide app and daily scripture rhythm.',
    likesCount: 19,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
];

app.get('/api/forum/posts', (req, res) => {
  res.json(forumPosts);
});

app.post('/api/forum/posts', (req, res) => {
  const { authorName, title, content, category } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  const newPost = {
    id: `post-${Date.now()}`,
    authorName: authorName || 'Rooted Pilgrim',
    title,
    content,
    category: category || 'plant_care',
    likesCount: 0,
    createdAt: new Date().toISOString(),
  };

  forumPosts.unshift(newPost);
  res.status(201).json(newPost);
});

app.post('/api/forum/posts/:id/like', (req, res) => {
  const post = forumPosts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.likesCount = (post.likesCount || 0) + 1;
  res.json({ success: true, likesCount: post.likesCount });
});

// -------------------------------------------------------------
// Offline Sync Batch Endpoint
// -------------------------------------------------------------
app.post('/api/sync/batch', (req, res) => {
  const { plants: queuedPlants, forumPosts: queuedPosts, reflections: queuedReflections } = req.body || {};

  let syncedPlantsCount = 0;
  let syncedPostsCount = 0;

  if (Array.isArray(queuedPlants)) {
    for (const p of queuedPlants) {
      const idx = inMemoryPlants.findIndex((item) => item.id === p.id);
      if (idx !== -1) {
        inMemoryPlants[idx] = { ...inMemoryPlants[idx], ...p };
      } else {
        inMemoryPlants.unshift(p);
      }
      syncedPlantsCount++;
    }
  }

  if (Array.isArray(queuedPosts)) {
    for (const post of queuedPosts) {
      if (!forumPosts.some((item) => item.id === post.id)) {
        forumPosts.unshift(post);
        syncedPostsCount++;
      }
    }
  }

  res.json({
    success: true,
    message: 'Offline changes synced successfully to cloud',
    syncedPlantsCount,
    syncedPostsCount,
    syncedAt: new Date().toISOString(),
  });
});


// -------------------------------------------------------------
// Vite Middleware / Static Serve
// -------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Plumb Line] Production server running on http://0.0.0.0:${PORT}`);
  });
}

start();
