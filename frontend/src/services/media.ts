import { api } from './api';
import type { Media, MediaInput, MediaType } from '@/types/Media';
import type { PaginatedResponse } from '@/types/User';

export const mediaApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PaginatedResponse<Media>>('/media', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Media }>(`/media/${id}`).then((r) => r.data.data),
  upload: (formData: FormData) =>
    api.post<{ data: Media }>('/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data),
  update: (id: number, data: MediaInput) =>
    api.put<{ data: Media }>(`/media/${id}`, data).then((r) => r.data.data),
  replace: (id: number, formData: FormData) =>
    api.post<{ data: Media }>(`/media/${id}/replace`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data),
  archive: (id: number) => api.post<{ data: Media }>(`/media/${id}/archive`).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/media/${id}`).then((r) => r.data),
  attach: (entity: string, entityId: number, mediaId: number, mediaType: string) =>
    api.post(`/${entity}/${entityId}/media`, { media_id: mediaId, media_type: mediaType }).then((r) => r.data),
  detach: (entity: string, entityId: number, mediaId: number, mediaType?: string) =>
    api
      .delete(`/${entity}/${entityId}/media/${mediaId}`, { params: mediaType ? { media_type: mediaType } : {} })
      .then((r) => r.data),
  types: () => api.get<{ data: MediaType[] }>('/media-types').then((r) => r.data.data),
  attachments: (id: number) =>
    api.get<{ data: Array<{ id: number; mediable_type: string; mediable_id: number; media_type: string; title: string | null; link: string | null }> }>(`/media/${id}/attachments`).then((r) => r.data.data),
};
