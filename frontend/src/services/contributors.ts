import { api } from './api';
import type { Contributor, ContributorInput, ContributorRole } from '@/types/Contributor';
import type { PaginatedResponse } from '@/types/User';

export const contributorsApi = {
  list: (params?: { q?: string; is_archived?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Contributor>>('/contributors', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Contributor }>(`/contributors/${id}`).then((r) => r.data.data),
  create: (data: ContributorInput) =>
    api.post<{ data: Contributor }>('/contributors', data).then((r) => r.data.data),
  update: (id: number, data: Partial<ContributorInput>) =>
    api.put<{ data: Contributor }>(`/contributors/${id}`, data).then((r) => r.data.data),
  archive: (id: number) =>
    api.post<{ data: Contributor }>(`/contributors/${id}/archive`).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/contributors/${id}`).then((r) => r.data),
  roles: () => api.get<{ data: ContributorRole[] }>('/contributor-roles').then((r) => r.data.data),
};
