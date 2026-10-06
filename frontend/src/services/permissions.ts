import { api } from './api';
import type { PaginatedResponse, Permission } from '@/types/User';

export const permissionsApi = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<Permission>>('/permissions', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Permission }>(`/permissions/${id}`).then((r) => r.data.data),
};
