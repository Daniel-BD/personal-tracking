import type { Category, EntryType, Item } from '@/shared/lib/types';

export type TypedItem = Item & { type: EntryType };
export type TypedCategory = Category & { type: EntryType };
