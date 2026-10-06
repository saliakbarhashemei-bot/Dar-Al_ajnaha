import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/services/api';
import { usersApi } from '@/services/users';
import { rolesApi } from '@/services/roles';
import { permissionsApi } from '@/services/permissions';
import { contributorsApi } from '@/services/contributors';
import { announcementsApi } from '@/services/announcements';
import { booksApi, bookCategoriesApi, tagsApi } from '@/services/books';
import { mediaApi } from '@/services/media';
import { authApi, ensureCsrfCookie } from '@/services/auth';

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mocked = api as unknown as Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  mocked.get.mockResolvedValue({ data: { data: { id: 1 }, meta: {} } });
  mocked.post.mockResolvedValue({ data: { data: { id: 1 } } });
  mocked.put.mockResolvedValue({ data: { data: { id: 1 } } });
  mocked.delete.mockResolvedValue({ data: { data: null } });
});

describe('usersApi', () => {
  it('list returns the full paginated envelope', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { total: 1 } } });

    await expect(usersApi.list({ search: 'ali' })).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { total: 1 },
    });
    expect(mocked.get).toHaveBeenCalledWith('/users', { params: { search: 'ali' } });
  });

  it('get unwraps the data envelope', async () => {
    await expect(usersApi.get(7)).resolves.toEqual({ id: 1 });
    expect(mocked.get).toHaveBeenCalledWith('/users/7');
  });

  it('create posts the payload', async () => {
    const payload = { name: 'A', email: 'a@b.c', password: 'p', password_confirmation: 'p', role_ids: [1] };

    await usersApi.create(payload);

    expect(mocked.post).toHaveBeenCalledWith('/users', payload);
  });

  it('update, disable, delete and updateRoles hit the right verbs', async () => {
    await usersApi.update(3, { name: 'B' });
    expect(mocked.put).toHaveBeenCalledWith('/users/3', { name: 'B' });

    await usersApi.disable(3);
    expect(mocked.post).toHaveBeenCalledWith('/users/3/disable');

    await usersApi.delete(3);
    expect(mocked.delete).toHaveBeenCalledWith('/users/3');

    await usersApi.updateRoles(3, [2, 4]);
    expect(mocked.put).toHaveBeenCalledWith('/users/3/roles', { role_ids: [2, 4] });
  });
});

describe('rolesApi', () => {
  it('covers every role endpoint', async () => {
    await rolesApi.list();
    expect(mocked.get).toHaveBeenCalledWith('/roles', { params: undefined });

    await rolesApi.get(2);
    expect(mocked.get).toHaveBeenCalledWith('/roles/2');

    await rolesApi.create({ name: 'editor', label: 'Editor' });
    expect(mocked.post).toHaveBeenCalledWith('/roles', { name: 'editor', label: 'Editor' });

    await rolesApi.update(2, { label: 'New' });
    expect(mocked.put).toHaveBeenCalledWith('/roles/2', { label: 'New' });

    await rolesApi.delete(2);
    expect(mocked.delete).toHaveBeenCalledWith('/roles/2');

    await rolesApi.updatePermissions(2, [5]);
    expect(mocked.put).toHaveBeenCalledWith('/roles/2/permissions', { permission_ids: [5] });
  });
});

describe('permissionsApi', () => {
  it('list and get', async () => {
    await permissionsApi.list({ page: 2 });
    expect(mocked.get).toHaveBeenCalledWith('/permissions', { params: { page: 2 } });

    await permissionsApi.get(9);
    expect(mocked.get).toHaveBeenCalledWith('/permissions/9');
  });
});

describe('contributorsApi', () => {
  it('covers every contributor endpoint', async () => {
    await contributorsApi.list({ q: 'nima' });
    expect(mocked.get).toHaveBeenCalledWith('/contributors', { params: { q: 'nima' } });

    await contributorsApi.get(4);
    expect(mocked.get).toHaveBeenCalledWith('/contributors/4');

    await contributorsApi.create({ name: 'Nima' });
    expect(mocked.post).toHaveBeenCalledWith('/contributors', { name: 'Nima' });

    await contributorsApi.update(4, { name: 'N' });
    expect(mocked.put).toHaveBeenCalledWith('/contributors/4', { name: 'N' });

    await contributorsApi.archive(4);
    expect(mocked.post).toHaveBeenCalledWith('/contributors/4/archive');

    await contributorsApi.delete(4);
    expect(mocked.delete).toHaveBeenCalledWith('/contributors/4');
  });

  it('roles unwraps the role list', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ id: 1, name: 'Author' }] } });

    await expect(contributorsApi.roles()).resolves.toEqual([{ id: 1, name: 'Author' }]);
    expect(mocked.get).toHaveBeenCalledWith('/contributor-roles');
  });
});

describe('announcementsApi', () => {
  it('covers every announcement endpoint', async () => {
    await announcementsApi.list({ q: 'launch' });
    expect(mocked.get).toHaveBeenCalledWith('/announcements', { params: { q: 'launch' } });

    await announcementsApi.get(5);
    expect(mocked.get).toHaveBeenCalledWith('/announcements/5');

    await announcementsApi.create({ title: 'T', type: 'News', status: 'Draft' });
    expect(mocked.post).toHaveBeenCalledWith('/announcements', { title: 'T', type: 'News', status: 'Draft' });

    await announcementsApi.update(5, { title: 'T2' });
    expect(mocked.put).toHaveBeenCalledWith('/announcements/5', { title: 'T2' });

    await announcementsApi.archive(5);
    expect(mocked.post).toHaveBeenCalledWith('/announcements/5/archive');

    await announcementsApi.delete(5);
    expect(mocked.delete).toHaveBeenCalledWith('/announcements/5');
  });
});

describe('booksApi', () => {
  it('covers every book endpoint', async () => {
    await booksApi.list({ q: 'garden' });
    expect(mocked.get).toHaveBeenCalledWith('/books', { params: { q: 'garden' } });

    await booksApi.get(6);
    expect(mocked.get).toHaveBeenCalledWith('/books/6');

    await booksApi.create({ title: 'B', status: 'Draft' });
    expect(mocked.post).toHaveBeenCalledWith('/books', { title: 'B', status: 'Draft' });

    await booksApi.update(6, { title: 'B2' });
    expect(mocked.put).toHaveBeenCalledWith('/books/6', { title: 'B2' });

    await booksApi.archive(6);
    expect(mocked.post).toHaveBeenCalledWith('/books/6/archive');

    await booksApi.delete(6);
    expect(mocked.delete).toHaveBeenCalledWith('/books/6');
  });

  it('attaches and detaches contributors', async () => {
    await booksApi.attachContributor(6, 3, 1);
    expect(mocked.post).toHaveBeenCalledWith('/books/6/contributors', {
      contributor_id: 3,
      contributor_role_id: 1,
    });

    await booksApi.detachContributor(6, 3, 1);
    expect(mocked.delete).toHaveBeenCalledWith('/books/6/contributors/3', {
      data: { contributor_role_id: 1 },
    });

    await booksApi.detachContributor(6, 3);
    expect(mocked.delete).toHaveBeenCalledWith('/books/6/contributors/3', { data: {} });
  });

  it('exposes book categories and tags as plain arrays', async () => {
    mocked.get.mockResolvedValue({ data: { data: [{ id: 1 }] } });

    await expect(bookCategoriesApi.list()).resolves.toEqual([{ id: 1 }]);
    await expect(tagsApi.list()).resolves.toEqual([{ id: 1 }]);

    expect(mocked.get).toHaveBeenCalledWith('/book-categories');
    expect(mocked.get).toHaveBeenCalledWith('/tags');
  });
});

describe('mediaApi', () => {
  it('covers every media endpoint', async () => {
    await mediaApi.list({ mime_type: 'image/jpeg' });
    expect(mocked.get).toHaveBeenCalledWith('/media', { params: { mime_type: 'image/jpeg' } });

    await mediaApi.get(8);
    expect(mocked.get).toHaveBeenCalledWith('/media/8');

    await mediaApi.update(8, { alt_text: 'A' });
    expect(mocked.put).toHaveBeenCalledWith('/media/8', { alt_text: 'A' });

    await mediaApi.archive(8);
    expect(mocked.post).toHaveBeenCalledWith('/media/8/archive');

    await mediaApi.delete(8);
    expect(mocked.delete).toHaveBeenCalledWith('/media/8');
  });

  it('uploads and replaces with multipart form data', async () => {
    const form = new FormData();
    form.append('file', 'x');

    await mediaApi.upload(form);
    expect(mocked.post).toHaveBeenCalledWith('/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    await mediaApi.replace(8, form);
    expect(mocked.post).toHaveBeenCalledWith('/media/8/replace', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('attaches and detaches media on an entity', async () => {
    await mediaApi.attach('books', 6, 8, 'Book Cover');
    expect(mocked.post).toHaveBeenCalledWith('/books/6/media', {
      media_id: 8,
      media_type: 'Book Cover',
    });

    await mediaApi.detach('books', 6, 8, 'Book Cover');
    expect(mocked.delete).toHaveBeenCalledWith('/books/6/media/8', {
      params: { media_type: 'Book Cover' },
    });

    await mediaApi.detach('books', 6, 8);
    expect(mocked.delete).toHaveBeenCalledWith('/books/6/media/8', { params: {} });
  });

  it('exposes types and attachments', async () => {
    mocked.get.mockResolvedValue({ data: { data: [] } });

    await expect(mediaApi.types()).resolves.toEqual([]);
    expect(mocked.get).toHaveBeenCalledWith('/media-types');

    await expect(mediaApi.attachments(8)).resolves.toEqual([]);
    expect(mocked.get).toHaveBeenCalledWith('/media/8/attachments');
  });
});

describe('authApi', () => {
  it('requests the CSRF cookie from the app root before logging in', async () => {
    mocked.post.mockResolvedValue({ data: { data: { user: { id: 1 } } } });

    await expect(authApi.login('a@b.c', 'secret')).resolves.toEqual({ data: { user: { id: 1 } } });

    expect(mocked.get).toHaveBeenCalledWith('/sanctum/csrf-cookie', { baseURL: '/' });
    expect(mocked.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'secret' });
  });

  it('ensureCsrfCookie targets the root path, not /api/v1', async () => {
    await ensureCsrfCookie();

    expect(mocked.get).toHaveBeenCalledWith('/sanctum/csrf-cookie', { baseURL: '/' });
  });

  it('me unwraps the user and updatePassword posts the payload', async () => {
    mocked.get.mockResolvedValue({ data: { data: { id: 1, email: 'a@b.c' } } });

    await expect(authApi.me()).resolves.toEqual({ id: 1, email: 'a@b.c' });
    expect(mocked.get).toHaveBeenCalledWith('/me');

    await authApi.updatePassword('old', 'new');
    expect(mocked.put).toHaveBeenCalledWith('/me/password', {
      current_password: 'old',
      password: 'new',
    });
  });

  it('logout posts to the logout endpoint', async () => {
    await authApi.logout();

    expect(mocked.post).toHaveBeenCalledWith('/auth/logout');
  });
});
