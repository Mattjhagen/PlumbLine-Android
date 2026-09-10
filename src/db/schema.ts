import { pgTable, text, serial, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (keyed by Firebase UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Plants table (tracked botanical specimens with watering and fertilizing schedules)
export const plants = pgTable('plants', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  species: text('species'),
  waterFrequencyDays: integer('water_frequency_days').notNull().default(7),
  fertilizeFrequencyDays: integer('fertilize_frequency_days').default(30),
  lastWateredAt: timestamp('last_watered_at').defaultNow(),
  lastFertilizedAt: timestamp('last_fertilized_at').defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Articles table (plant care guides and botanical scripture articles)
export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'care_guide' | 'devotional' | 'scripture'
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  scriptureRef: text('scripture_ref'),
  readTimeMinutes: integer('read_time_minutes').default(5),
  createdAt: timestamp('created_at').defaultNow(),
});

// Community Forum Posts
export const forumPosts = pgTable('forum_posts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  authorName: text('author_name').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(), // 'plant_care' | 'bible_study' | 'prayer' | 'testimony'
  likesCount: integer('likes_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Dynamic Bible Plans (formulated with OpenRouter)
export const biblePlans = pgTable('bible_plans', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  focus: text('focus').notNull(),
  planJson: text('plan_json').notNull(), // Serialized adaptive itinerary
  currentDay: integer('current_day').default(1),
  totalDays: integer('total_days').default(7),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  plants: many(plants),
  forumPosts: many(forumPosts),
  biblePlans: many(biblePlans),
}));
