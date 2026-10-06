import type { Media } from './Media';

export interface AttachedMedia extends Media {
  pivot_media_type: string;
}

export interface Contributor {
  id: number;
  name: string;
  slug: string;
  biography: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  birth_date: string | null;
  nationality: string | null;
  is_archived: boolean;
  books_count?: number;
  media?: AttachedMedia[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContributorInput {
  name: string;
  slug?: string;
  biography?: string;
  email?: string;
  phone?: string;
  website?: string;
  birth_date?: string;
  nationality?: string;
}

export interface ContributorRole {
  id: number;
  name: string;
  label: string;
}
