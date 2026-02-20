import { z } from 'zod';

// ── Domain schemas ─────────────────────────────────────────

export const CategorySentimentSchema = z.enum(['positive', 'neutral', 'limit']);

export const CategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	sentiment: CategorySentimentSchema,
});

export const ItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	categories: z.array(z.string()),
});

export const EntryTypeSchema = z.enum(['activity', 'food']);

export const EntrySchema = z.object({
	id: z.string(),
	type: EntryTypeSchema,
	itemId: z.string(),
	date: z.string(),
	time: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	categoryOverrides: z.array(z.string()).nullable().optional(),
});

export const DashboardCardSchema = z.object({
	categoryId: z.string(),
	baseline: z.literal('rolling_4_week_avg'),
	comparison: z.literal('last_week'),
});

export const TrackerDataSchema = z.object({
	activityItems: z.array(ItemSchema),
	foodItems: z.array(ItemSchema),
	activityCategories: z.array(CategorySchema),
	foodCategories: z.array(CategorySchema),
	entries: z.array(EntrySchema),
	dashboardCards: z.array(DashboardCardSchema).optional(),
	dashboardInitialized: z.boolean().optional(),
	favoriteItems: z.array(z.string()).optional(),
});

// ── GitHub API response schemas ────────────────────────────

export const GistFileSchema = z.object({
	filename: z.string(),
	content: z.string(),
});

export const GistResponseSchema = z.object({
	id: z.string(),
	files: z.record(z.string(), GistFileSchema),
	updated_at: z.string(),
});

// ── Import validation (lenient: accepts data before migration) ──

/** Category schema that accepts missing sentiment (pre-migration data) */
const CategoryImportSchema = z.object({
	id: z.string(),
	name: z.string(),
	sentiment: CategorySentimentSchema.optional(),
});

export const TrackerDataImportSchema = z.object({
	activityItems: z.array(ItemSchema),
	foodItems: z.array(ItemSchema),
	activityCategories: z.array(CategoryImportSchema),
	foodCategories: z.array(CategoryImportSchema),
	entries: z.array(EntrySchema),
	dashboardCards: z.array(DashboardCardSchema).optional(),
	dashboardInitialized: z.boolean().optional(),
	favoriteItems: z.array(z.string()).optional(),
});
