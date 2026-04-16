export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'editor' | 'admin';
  avatar_url?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  news_count?: number;
}

export interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  exchange?: string;
  sector?: string;
  current_price?: number;
  price_change?: number;
  price_change_pct?: number;
  market_cap?: number;
  last_updated?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  thumbnail_url?: string;
  author?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  category?: Pick<Category, 'id' | 'name' | 'slug' | 'color'>;
  stocks?: Pick<Stock, 'id' | 'symbol' | 'company_name'>[];
  doc_status: 0 | 1 | 2;
  is_featured?: boolean;
  views?: number;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const DOC_STATUS_LABEL: Record<0 | 1 | 2, string> = {
  0: 'Draft',
  1: 'Published',
  2: 'Archived',
};

export const DOC_STATUS_COLORS: Record<0 | 1 | 2, string> = {
  0: 'bg-gray-700 text-gray-400',
  1: 'bg-green-500/20 text-green-400',
  2: 'bg-yellow-500/20 text-yellow-400',
};

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface NewsParams {
  page?: number;
  limit?: number;
  category?: string;
  doc_status?: number;
  search?: string;
  featured?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  full_name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'editor' | 'admin';
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface AdminStats {
  users: number;
  articles: number;
  categories: number;
  stocks: number;
  totalViews: number;
}
