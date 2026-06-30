# Hotshot Fabrics - Premium Fashion E-Commerce

A production-ready, premium fashion e-commerce website built with React, Tailwind CSS, Supabase, and Framer Motion.

## Features

### Public Website
- Hero section with fashion banners
- Featured collections grid
- New arrivals, best sellers, trending products
- Customer testimonials
- Newsletter signup
- Instagram-style gallery
- Full product catalog with filtering & sorting
- Product detail page with image zoom, color/size selection
- Shopping cart with quantity management
- Checkout with WhatsApp integration
- Order tracking with real-time updates

### Authentication
- Email/password login
- Google OAuth
- User profiles with avatar upload
- Session management

### Customer Dashboard
- View profile & edit settings
- Order history with tracking
- Saved addresses management
- Wishlist management

### Admin Dashboard
- Product CRUD with image upload
- Order management with status updates
- Customer management
- Category management
- Review moderation
- Analytics & reporting
- Site settings

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Build Tool**: Vite

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Run the SQL schema in `supabase/migrations/001_complete_schema.sql`
5. Create storage buckets: `product-images`, `avatars`, `banners`
6. Run the development server: `npm run dev`

## Database Schema

The complete schema includes:
- Categories (with parent/child hierarchy)
- Products with images, colors, sizes
- User profiles & addresses
- Cart & wishlist
- Orders with items & tracking
- Reviews
- Hero banners & testimonials
- Newsletter subscribers
- Admin logs & site settings

## RLS Policies

All tables have Row Level Security enabled with policies for:
- Public read access for active products/categories
- Authenticated user access for personal data
- Admin-only access for management operations

## License

MIT
