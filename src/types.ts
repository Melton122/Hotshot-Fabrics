// ============================================
// HOTSHOT FABRICS - TYPE DEFINITIONS
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'customer' | 'admin';
  gender: string | null;
  date_of_birth: string | null;
  total_spent: number;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  sku: string | null;
  category_id: string | null;
  stock_quantity: number;
  material: string | null;
  care_instructions: string | null;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_bestseller: boolean;
  is_active: boolean;
  colors: string[];
  sizes: string[];
  tags: string[];
  rating: number;
  review_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  category?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Color {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number;
}

export interface Size {
  id: string;
  name: string;
  sort_order: number;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  color_id: string | null;
  size_id: string | null;
  quantity: number;
  created_at: string;
  product?: Product;
  color_name?: string;
  size_name?: string;
  product_image?: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  shipping_cost: number;
  total: number;
  shipping_address: ShippingAddress;
  notes: string | null;
  tracking_number: string | null;
  courier_name: string | null;
  whatsapp_number: string;
  guest_email: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready_for_delivery' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled' 
  | 'returned';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image: string | null;
  color_name: string | null;
  size_name: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface OrderTracking {
  id: string;
  order_id: string;
  status: OrderStatus;
  description: string;
  is_customer_visible: boolean;
  created_at: string;
}

export interface ShippingAddress {
  label?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_approved: boolean;
  created_at: string;
  user?: { full_name: string | null; avatar_url: string | null };
  product?: { name: string; slug: string };
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
  product_image?: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_link: string;
  is_active: boolean;
  sort_order: number;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  customer_image: string;
  content: string;
  rating: number;
  is_featured: boolean;
  sort_order: number;
}

export interface SiteSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  todayOrders: number;
  lowStock: number;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface HomeAnnouncement {
  id: string;
  title: string;
  content: string | null;
  badge: string;
  bg_color: string;
  text_color: string;
  border_color: string;
  link_url: string | null;
  link_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ViewName = 
  | 'home' | 'shop' | 'product' | 'cart' | 'checkout' 
  | 'login' | 'register' | 'wishlist' | 'profile' 
  | 'orders' | 'order-detail' | 'dashboard' | 'addresses'
  | 'contact' | 'shipping' | 'returns' | 'size-guide' 
  | 'faq' | 'privacy' | 'terms'
  | 'admin-dashboard' | 'admin-products' | 'admin-orders' 
  | 'admin-customers' | 'admin-categories' | 'admin-reviews' 
  | 'admin-analytics' | 'admin-settings' | 'admin-home'
  | 'admin-banners' | 'admin-colors' | 'admin-sizes';