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

export interface MarketDataItem {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  high: number;
  low: number;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  url: string;
  media_type: 'image' | 'video';
  display_order: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  thumbnail_url?: string;
  media?: MediaItem[];
  author?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  category?: Pick<Category, 'id' | 'name' | 'slug' | 'color'>;
  stocks?: Pick<Stock, 'id' | 'symbol' | 'company_name'>[];
  doc_status: 0 | 1 | 2;
  is_featured?: boolean;
  views?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  is_liked_by_me?: boolean;
  is_bookmarked_by_me?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EngagementCounts {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface ArticleLike {
  article_id: string;
  liked: boolean;
  total_likes: number;
}

export interface ArticleBookmark {
  article_id: string;
  bookmarked: boolean;
}

export interface Comment {
  id: string;
  article_id: string;
  author: Pick<User, 'id' | 'full_name' | 'avatar_url'> | null;
  body: string;
  parent_id: string | null;
  replies?: Comment[];
  like_count: number;
  is_liked_by_me: boolean;
  is_edited: boolean;
  is_deleted?: boolean;
  reply_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CommentPage {
  data: Comment[];
  pagination: Pagination;
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
