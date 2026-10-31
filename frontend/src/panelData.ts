import { api } from '@/services/api';
import type { Announcement } from '@/types/Announcement';
import type { Book } from '@/types/Book';
import type { Contributor } from '@/types/Contributor';
import type { Media } from '@/types/Media';
import type { PaginatedResponse, Role, User } from '@/types/User';

export type SectionKey = 'books' | 'media' | 'users' | 'contributors' | 'announcements' | 'roles';
export type RecordItem = Book | Media | User | Contributor | Announcement | Role;
export type Collection = { items: RecordItem[]; total: number | null; error: boolean; loading: boolean };
export type Collections = Record<SectionKey, Collection>;

export const sectionKeys: SectionKey[] = ['books', 'media', 'users', 'contributors', 'announcements', 'roles'];
export const emptyCollections = (): Collections => {
  const empty = (): Collection => ({ items: [], total: null, error: false, loading: true });
  return {
    books: empty(), media: empty(), users: empty(),
    contributors: empty(), announcements: empty(), roles: empty(),
  };
};

export async function loadCollections(): Promise<Collections> {
  const responses = await Promise.allSettled(sectionKeys.map(async key => {
    const response = await api.get<PaginatedResponse<RecordItem>>(`/${key}`, {
      params: { per_page: 100 },
      timeout: 6000,
    });
    return response.data;
  }));

  return Object.fromEntries(sectionKeys.map((key, index) => {
    const result = responses[index];
    if (result?.status === 'fulfilled') {
      return [key, { items: result.value.data, total: result.value.meta.total, error: false, loading: false }];
    }
    return [key, { items: [], total: null, error: true, loading: false }];
  })) as Collections;
}

export type ViewRow = {
  id: number;
  title: string;
  detail: string;
  category: string;
  status: string;
  date: string;
  image?: string;
  updatedAt: string;
};

const toDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const statuses: Record<string, string> = {
  Draft: 'پیش‌نویس', Review: 'در انتظار بررسی', Scheduled: 'زمان‌بندی‌شده',
  Published: 'منتشر شده', Archived: 'بایگانی‌شده',
};
export const statusLabel = (status: string) => statuses[status] ?? status;

const announcementTypes: Record<string, string> = {
  'New Book': 'کتاب جدید', Reprint: 'تجدید چاپ', 'New Edition': 'ویرایش جدید',
  News: 'خبر', Event: 'رویداد', Discount: 'تخفیف', Other: 'سایر',
};

export function rowsFor(key: SectionKey, items: RecordItem[]): ViewRow[] {
  return items.map(item => {
    switch (key) {
      case 'books': {
        const book = item as Book;
        const author = book.contributors?.flatMap(group => group.people).map(person => person.name).join('، ');
        return { id: book.id, title: book.title, detail: author || book.publisher || 'بدون پدیدآورنده', category: book.category?.label ?? book.genre ?? 'دسته‌بندی نشده', status: statusLabel(book.status), date: toDate(book.updated_at), updatedAt: book.updated_at, image: book.media?.find(media => media.pivot_media_type === 'Book Cover')?.url };
      }
      case 'media': {
        const media = item as Media;
        return { id: media.id, title: media.file_name, detail: media.caption || media.alt_text || media.mime_type, category: media.mime_type.startsWith('image/') ? 'تصویر' : media.mime_type.startsWith('video/') ? 'ویدئو' : media.mime_type.startsWith('audio/') ? 'صوت' : 'فایل', status: media.is_archived ? 'بایگانی‌شده' : 'فعال', date: toDate(media.updated_at), updatedAt: media.updated_at, image: media.mime_type.startsWith('image/') ? media.url : undefined };
      }
      case 'users': {
        const user = item as User;
        return { id: user.id, title: user.name, detail: user.email, category: user.roles.map(role => role.label).join('، ') || 'بدون نقش', status: user.is_active ? 'فعال' : 'غیرفعال', date: toDate(user.updated_at), updatedAt: user.updated_at };
      }
      case 'contributors': {
        const contributor = item as Contributor;
        return { id: contributor.id, title: contributor.name, detail: contributor.books_count == null ? 'پدیدآورنده' : `${new Intl.NumberFormat('fa-IR').format(contributor.books_count)} کتاب`, category: contributor.nationality || 'پدیدآورنده', status: contributor.is_archived ? 'بایگانی‌شده' : 'فعال', date: toDate(contributor.updated_at), updatedAt: contributor.updated_at, image: contributor.media?.find(media => media.pivot_media_type === 'Person Photo')?.url };
      }
      case 'announcements': {
        const announcement = item as Announcement;
        return { id: announcement.id, title: announcement.title, detail: announcement.short_description || announcement.book?.title || 'اطلاعیه', category: announcementTypes[announcement.type] ?? announcement.type, status: statusLabel(announcement.status), date: toDate(announcement.updated_at), updatedAt: announcement.updated_at, image: announcement.media?.find(media => media.pivot_media_type === 'Announcement Image')?.url };
      }
      case 'roles': {
        const role = item as Role;
        return { id: role.id, title: role.label, detail: role.name, category: `${new Intl.NumberFormat('fa-IR').format(role.permissions.length)} دسترسی`, status: 'فعال', date: toDate(role.updated_at), updatedAt: role.updated_at };
      }
    }
  });
}
