import { describe, it, expect } from 'vitest';
import {
	CategorySchema,
	ItemSchema,
	EntrySchema,
	DashboardCardSchema,
	TrackerDataSchema,
	TrackerDataImportSchema,
	GistFileSchema,
	GistResponseSchema,
} from '../schemas';

describe('Zod schemas', () => {
	describe('CategorySchema', () => {
		it('accepts valid category', () => {
			const result = CategorySchema.safeParse({ id: 'c1', name: 'Fruit', sentiment: 'positive' });
			expect(result.success).toBe(true);
		});

		it('rejects invalid sentiment', () => {
			const result = CategorySchema.safeParse({ id: 'c1', name: 'Fruit', sentiment: 'bad' });
			expect(result.success).toBe(false);
		});

		it('rejects missing name', () => {
			const result = CategorySchema.safeParse({ id: 'c1', sentiment: 'neutral' });
			expect(result.success).toBe(false);
		});
	});

	describe('ItemSchema', () => {
		it('accepts valid item', () => {
			const result = ItemSchema.safeParse({ id: 'i1', name: 'Apple', categories: ['c1'] });
			expect(result.success).toBe(true);
		});

		it('rejects non-string category IDs', () => {
			const result = ItemSchema.safeParse({ id: 'i1', name: 'Apple', categories: [123] });
			expect(result.success).toBe(false);
		});
	});

	describe('EntrySchema', () => {
		it('accepts full entry', () => {
			const result = EntrySchema.safeParse({
				id: 'e1',
				type: 'food',
				itemId: 'i1',
				date: '2025-01-15',
				time: '12:30',
				notes: 'Test',
				categoryOverrides: ['c1'],
			});
			expect(result.success).toBe(true);
		});

		it('accepts entry with null optional fields', () => {
			const result = EntrySchema.safeParse({
				id: 'e1',
				type: 'activity',
				itemId: 'i1',
				date: '2025-01-15',
				time: null,
				notes: null,
				categoryOverrides: null,
			});
			expect(result.success).toBe(true);
		});

		it('accepts entry with omitted optional fields', () => {
			const result = EntrySchema.safeParse({
				id: 'e1',
				type: 'food',
				itemId: 'i1',
				date: '2025-01-15',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid type', () => {
			const result = EntrySchema.safeParse({
				id: 'e1',
				type: 'invalid',
				itemId: 'i1',
				date: '2025-01-15',
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-string time', () => {
			const result = EntrySchema.safeParse({
				id: 'e1',
				type: 'food',
				itemId: 'i1',
				date: '2025-01-15',
				time: 123,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('DashboardCardSchema', () => {
		it('accepts valid card', () => {
			const result = DashboardCardSchema.safeParse({
				categoryId: 'c1',
				baseline: 'rolling_4_week_avg',
				comparison: 'last_week',
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid baseline', () => {
			const result = DashboardCardSchema.safeParse({
				categoryId: 'c1',
				baseline: 'weekly',
				comparison: 'last_week',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('TrackerDataSchema', () => {
		it('accepts valid tracker data', () => {
			const result = TrackerDataSchema.safeParse({
				activityItems: [],
				foodItems: [],
				activityCategories: [],
				foodCategories: [],
				entries: [],
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing required arrays', () => {
			const result = TrackerDataSchema.safeParse({ activityItems: [] });
			expect(result.success).toBe(false);
		});
	});

	describe('TrackerDataImportSchema', () => {
		it('accepts categories without sentiment (pre-migration)', () => {
			const result = TrackerDataImportSchema.safeParse({
				activityItems: [],
				foodItems: [],
				activityCategories: [{ id: 'c1', name: 'Cardio' }],
				foodCategories: [],
				entries: [],
			});
			expect(result.success).toBe(true);
		});
	});

	describe('GistFileSchema', () => {
		it('accepts valid gist file', () => {
			const result = GistFileSchema.safeParse({ filename: 'test.json', content: '{}' });
			expect(result.success).toBe(true);
		});
	});

	describe('GistResponseSchema', () => {
		it('accepts valid gist response', () => {
			const result = GistResponseSchema.safeParse({
				id: 'abc123',
				files: { 'test.json': { filename: 'test.json', content: '{}' } },
				updated_at: '2025-01-15T00:00:00Z',
			});
			expect(result.success).toBe(true);
		});
	});
});
