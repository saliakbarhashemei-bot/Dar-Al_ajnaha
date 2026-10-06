import { api } from './api';
import type { PaginatedResponse, Role } from '@/types/User';

export const rolesApi = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<Role>>('/roles', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: Role }>(`/roles/${id}`).then((r) => r.data.data),
  create: (data: { name: string; label: string }) =>
    api.post<{ data: Role }>('/roles', data).then((r) => r.data.data),
  update: (id: number, data: Partial<{ name: string; label: string }>) =>
    api.put<{ data: Role }>(`/roles/${id}`, data).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/roles/${id}`).then((r) => r.data),
  updatePermissions: (id: number, permissionIds: number[]) =>
    api.put<{ data: Role }>(`/roles/${id}/permissions`, { permission_ids: permissionIds }).then((r) => r.data.data),
};
