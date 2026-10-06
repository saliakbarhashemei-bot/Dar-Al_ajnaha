import { api } from './api';
import type { Book, BookCategory, BookInput, Tag } from '@/types/Book';
import type { PaginatedResponse } from '@/types/User';

export const booksApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PaginatedResponse<Book>>('/books', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Book }>(`/books/${id}`).then((r) => r.data.data),
  create: (data: BookInput) => api.post<{ data: Book }>('/books', data).then((r) => r.data.data),
  update: (id: number, data: Partial<BookInput>) =>
    api.put<{ data: Book }>(`/books/${id}`, data).then((r) => r.data.data),
  archive: (id: number) => api.post<{ data: Book }>(`/books/${id}/archive`).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/books/${id}`).then((r) => r.data),
  attachContributor: (bookId: number, contributorId: number, roleId: number) =>
    api
      .post(`/books/${bookId}/contributors`, { contributor_id: contributorId, contributor_role_id: roleId })
      .then((r) => r.data),
  detachContributor: (bookId: number, contributorId: number, roleId?: number) =>
    api
      .delete(`/books/${bookId}/contributors/${contributorId}`, { data: roleId ? { contributor_role_id: roleId } : {} })
      .then((r) => r.data),
};

export const bookCategoriesApi = {
  list: () => api.get<{ data: BookCategory[] }>('/book-categories').then((r) => r.data.data),
};

export const tagsApi = {
  list: () => api.get<{ data: Tag[] }>('/tags').then((r) => r.data.data),
};
