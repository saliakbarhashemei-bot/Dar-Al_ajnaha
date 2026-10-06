import type { AttachedMedia, Book } from './Book';

export type AnnouncementType = 'New Book' | 'Reprint' | 'New Edition' | 'News' | 'Event' | 'Discount' | 'Other';

export type AnnouncementStatus = 'Draft' | 'Review' | 'Scheduled' | 'Published' | 'Archived';

export interface Announcement {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  content: string | null;
  type: AnnouncementType;
  status: AnnouncementStatus;
  book: Pick<Book, 'id' | 'title' | 'slug'> | null;
  scheduled_at: string | null;
  published_at: string | null;
  is_archived: boolean;
  media?: AttachedMedia[];
  created_at: string;
  updated_at: string;
}

export interface AnnouncementInput {
  title: string;
  slug?: string;
  short_description?: string;
  content?: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  book_id?: number;
  scheduled_at?: string;
  published_at?: string;
}
