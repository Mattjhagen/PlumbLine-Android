/**
 * Core domain types for Plumb Line (Rooted Guide)
 */

export enum BibleBook {
  Genesis = 'Genesis',
  Exodus = 'Exodus',
  Leviticus = 'Leviticus',
  Numbers = 'Numbers',
  Deuteronomy = 'Deuteronomy',
  Joshua = 'Joshua',
  Judges = 'Judges',
  Ruth = 'Ruth',
  Samuel1 = '1 Samuel',
  Samuel2 = '2 Samuel',
  Kings1 = '1 Kings',
  Kings2 = '2 Kings',
  Chronicles1 = '1 Chronicles',
  Chronicles2 = '2 Chronicles',
  Ezra = 'Ezra',
  Nehemiah = 'Nehemiah',
  Esther = 'Esther',
  Job = 'Job',
  Psalms = 'Psalms',
  Proverbs = 'Proverbs',
  Ecclesiastes = 'Ecclesiastes',
  SongOfSolomon = 'Song of Solomon',
  Isaiah = 'Isaiah',
  Jeremiah = 'Jeremiah',
  Lamentations = 'Lamentations',
  Ezekiel = 'Ezekiel',
  Daniel = 'Daniel',
  Hosea = 'Hosea',
  Joel = 'Joel',
  Amos = 'Amos',
  Obadiah = 'Obadiah',
  Jonah = 'Jonah',
  Micah = 'Micah',
  Nahum = 'Nahum',
  Habakkuk = 'Habakkuk',
  Zephaniah = 'Zephaniah',
  Haggai = 'Haggai',
  Zechariah = 'Zechariah',
  Malachi = 'Malachi',
  Matthew = 'Matthew',
  Mark = 'Mark',
  Luke = 'Luke',
  John = 'John',
  Acts = 'Acts',
  Romans = 'Romans',
  Corinthians1 = '1 Corinthians',
  Corinthians2 = '2 Corinthians',
  Galatians = 'Galatians',
  Ephesians = 'Ephesians',
  Philippians = 'Philippians',
  Colossians = 'Colossians',
  Thessalonians1 = '1 Thessalonians',
  Thessalonians2 = '2 Thessalonians',
  Timothy1 = '1 Timothy',
  Timothy2 = '2 Timothy',
  Titus = 'Titus',
  Philemon = 'Philemon',
  Hebrews = 'Hebrews',
  James = 'James',
  Peter1 = '1 Peter',
  Peter2 = '2 Peter',
  John1 = '1 John',
  John2 = '2 John',
  John3 = '3 John',
  Jude = 'Jude',
  Revelation = 'Revelation',
}

export type BibleBookValue = `${BibleBook}`;

export interface VerseRef {
  book: BibleBookValue | string;
  chapter: number;
  verse: number;
}

export interface PassageRef {
  book: BibleBookValue | string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface Verse {
  id?: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation?: string;
}

export interface BookInfo {
  id: number;
  usfm_id: string;
  name: string;
  canonical_order: number;
  testament: 'OT' | 'NT';
  total_chapters: number;
}

export type SafetyCategory = 'safe' | 'needs_support' | 'crisis' | 'off_topic';

export interface CitationReference {
  book: BibleBookValue | string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  text?: string;
}

export interface GuideServiceResponse {
  version: string;
  requestId: string;
  text: string;
  citations: CitationReference[];
  nextQuestion?: string;
  safetyCategory: SafetyCategory;
  uncertaintyFlag?: boolean;
  timestamp: string;
}

export interface GuideTurn {
  id: string;
  role: 'user' | 'guide';
  content: string;
  citations?: CitationReference[];
  safetyCategory?: SafetyCategory;
  timestamp: string;
  nextQuestion?: string;
}

export type ModuleType = 'arrive' | 'read' | 'reflect' | 'respond' | 'close';

export interface DailyPathModule {
  type: ModuleType;
  title: string;
  prompt: string;
  placeholder: string;
}

export interface DailyPathSession {
  id: string;
  date: string;
  currentModule: ModuleType;
  drafts: Record<ModuleType, string>;
  completedAt?: string;
  nextDevotionalAvailableAt?: string;
  passageRef: PassageRef;
}

export type HighlightColor = 'gold' | 'sage' | 'sky' | 'rose';

export interface Highlight {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  createdAt: string;
}

export interface UserNote {
  id: string;
  kind: 'note' | 'reflection' | 'prayer';
  book?: string;
  chapter?: number;
  verse?: number;
  content: string;
  createdAt: string;
}

export interface ReaderPreferences {
  theme: 'system' | 'light' | 'dark';
  fontFamily: 'serif' | 'sans';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  lineSpacing: 'normal' | 'relaxed';
}

