export type BookStatus = 'Draft' | 'Review' | 'Scheduled' | 'Published' | 'Archived';

export interface BookCategory {
  id: number;
  name: string;
  label: string;
}

export interface Tag {
  id: number;
  name: string;
  label: string;
}

import type { Media } from './Media';

export interface AttachedMedia extends Media {
  pivot_media_type: string;
}

export interface BookContributorGroup {
  role_id: number;
  role_name: string;
  role_label: string;
  people: Array<{ id: number; name: string; slug: string }>;
}

export interface Book {
  id: number;
  title: string;
  slug: string;
  isbn: string | null;
  description: string | null;
  page_count: number | null;
  language: string | null;
  publication_date: string | null;
  publisher: string | null;
  edition: string | null;
  status: BookStatus;
  is_archived: boolean;
  category: BookCategory | null;
  genre: string | null;
  tags: Tag[];
  contributors: BookContributorGroup[];
  contributors_count?: number;
  media?: AttachedMedia[];
  created_at: string;
  updated_at: string;
}

export interface BookContributorInput {
  contributor_id: number;
  contributor_role_id?: number;
  role?: string;
}

export interface BookInput {
  title: string;
  slug?: string;
  isbn?: string;
  description?: string;
  page_count?: number;
  language?: string;
  publication_date?: string;
  publisher?: string;
  edition?: string;
  status: BookStatus;
  book_category_id?: number;
  genre?: string;
  tag_ids?: number[];
  contributors?: BookContributorInput[];
}
