import { api } from './api';
import type { PaginatedResponse, User } from '@/types/User';

export const usersApi = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),
  get: (id: number) => api.get<{ data: User }>(`/users/${id}`).then((r) => r.data.data),
  create: (data: { name: string; email: string; password: string; password_confirmation: string; role_ids: number[] }) =>
    api.post<{ data: User }>('/users', data).then((r) => r.data.data),
  update: (id: number, data: Partial<{ name: string; email: string; password: string; password_confirmation: string; is_active: boolean }>) =>
    api.put<{ data: User }>(`/users/${id}`, data).then((r) => r.data.data),
  disable: (id: number) => api.post<{ data: User }>(`/users/${id}/disable`).then((r) => r.data.data),
  delete: (id: number) => api.delete(`/users/${id}`).then((r) => r.data),
  updateRoles: (id: number, roleIds: number[]) =>
    api.put<{ data: User }>(`/users/${id}/roles`, { role_ids: roleIds }).then((r) => r.data.data),
};
