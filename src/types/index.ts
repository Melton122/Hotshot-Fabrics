// src/types/index.ts
export * from '../App';

// Additional types for better type safety
export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  tags?: string[];
  sortBy?: 'newest' | 'popular' | 'price-asc' | 'price-desc' | 'rating';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AddressFormData {
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface CheckoutFormData {
  full_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  notes?: string;
  payment_method: 'cod' | 'whatsapp' | 'card';
}

export interface ReviewFormData {
  rating: number;
  title?: string;
  content?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface NewsletterFormData {
  email: string;
  name?: string;
}