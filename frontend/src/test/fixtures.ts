import type { Announcement } from '@/types/Announcement';
import type { Book } from '@/types/Book';
import type { Contributor } from '@/types/Contributor';
import type { Media } from '@/types/Media';
import type { PaginatedResponse, Permission, Role, User } from '@/types/User';

const timestamp = '2026-01-01T00:00:00Z';

export function makePermission(overrides: Partial<Permission> = {}): Permission {
  return { id: 1, name: 'books.create', label: 'Create Book', ...overrides };
}

export function makeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 1,
    name: 'admin',
    label: 'Administrator',
    permissions: [],
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@example.com',
    is_active: true,
    email_verified_at: null,
    last_login_at: null,
    roles: [],
    permissions: [],
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: 'The Persian Garden',
    slug: 'the-persian-garden',
    isbn: null,
    description: null,
    page_count: null,
    language: null,
    publication_date: null,
    publisher: null,
    edition: null,
    status: 'Draft',
    is_archived: false,
    category: null,
    genre: null,
    tags: [],
    contributors: [],
    contributors_count: 0,
    media: [],
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

export function makeContributor(overrides: Partial<Contributor> = {}): Contributor {
  return {
    id: 1,
    name: 'Nima Yushij',
    slug: 'nima-yushij',
    biography: null,
    email: null,
    phone: null,
    website: null,
    birth_date: null,
    nationality: null,
    is_archived: false,
    books_count: 0,
    media: [],
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    ...overrides,
  };
}

export function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 1,
    title: 'New Edition',
    slug: 'new-edition',
    type: 'News',
    status: 'Draft',
    short_description: null,
    content: null,
    is_archived: false,
    book: null,
    media: [],
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  } as Announcement;
}

export function makeMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    file_name: 'cover.jpg',
    mime_type: 'image/jpeg',
    size: 2048,
    width: 800,
    height: 1200,
    url: '/api/v1/media/1/file',
    alt_text: null,
    caption: null,
    description: null,
    is_archived: false,
    uploaded_by: null,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

export function paginated<T>(data: T[]): PaginatedResponse<T> {
  return {
    data,
    meta: { page: 1, per_page: 15, total: data.length, last_page: 1 },
  };
}
