import { api } from './api';
import type { Announcement, AnnouncementInput } from '@/types/Announcement';
import type { PaginatedResponse } from '@/types/User';

export const announcementsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<PaginatedResponse<Announcement>>('/announcements', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Announcement }>(`/announcements/${id}`).then((r) => r.data.data),
  create: (data: AnnouncementInput) =>
    api.post<{ data: Announcement }>('/announcements', data).then((r) => r.data.data),
  update: (id: number, data: Partial<AnnouncementInput>) =>
    api.put<{ data: Announcement }>(`/announcements/${id}`, data).then((r) => r.data.data),
  archive: (id: number) => api.post<{ data: Announcement }>(`/announcements/${id}/archive`).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/announcements/${id}`).then((r) => r.data),
};
