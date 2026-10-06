export interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  roles: Role[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  label: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  label: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface ApiError {
  type: string;
  errors?: Array<{ field: string; message: string }>;
  message?: string;
}
