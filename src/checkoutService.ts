// checkoutService.ts - Complete checkout flow with schema-safe operations
import { supabase } from "./AppContext";

export interface ShippingAddress {
  full_name: string;
  phone: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province?: string;
  postal_code: string;
  country?: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_image?: string;
  color_id?: string;
  color_name?: string;
  size_id?: string;
  size_name?: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

// ─── GET CART WITH FULL DETAILS ───
export async function getCartWithDetails(userId: string) {
  const { data, error } = await supabase
    .from("cart_items")
    .select(`
      *,
      product:products(id, name, slug, price, stock_quantity, sku, images:product_images(image_url)),
      color:colors(id, name, hex_code),
      size:sizes(id, name)
    `)
    .eq("user_id", userId);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product?.name,
    product_image: item.product?.images?.[0]?.image_url,
    product_slug: item.product?.slug,
    sku: item.product?.sku,
    stock_quantity: item.product?.stock_quantity,
    color_id: item.color_id,
    color_name: item.color?.name,
    color_hex: item.color?.hex_code,
    size_id: item.size_id,
    size_name: item.size?.name,
    quantity: item.quantity,
    unit_price: item.product?.price || 0,
    total_price: (item.product?.price || 0) * item.quantity,
  }));
}

// ─── CREATE ORDER ───
export async function createOrder(
  userId: string,
  shippingAddress: ShippingAddress,
  cartItems: any[],
  options: {
    guestEmail?: string;
    notes?: string;
    discountCode?: string;
    discountAmount?: number;
  } = {}
) {
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.total_price || item.unit_price * item.quantity), 0);
  const shippingCost = subtotal >= 1500 ? 0 : 80;
  const discountAmount = options.discountAmount || 0;
  const total = subtotal + shippingCost - discountAmount;

  // 1. Create the order
  const orderPayload: any = {
    user_id: userId,
    status: "pending",
    shipping_address: shippingAddress,
    guest_email: options.guestEmail || null,
    notes: options.notes || null,
    subtotal,
    shipping_cost: shippingCost,
    discount_amount: discountAmount,
    total,
    payment_method: "whatsapp",
    payment_status: "pending",
  };

  let orderData;
  let orderError;

  try {
    const result = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();
    orderData = result.data;
    orderError = result.error;
  } catch (e) {
  }

  if (orderError || !orderData) {
    const minimalPayload = {
      user_id: userId,
      status: "pending",
      shipping_address: shippingAddress,
      total,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(minimalPayload)
      .select()
      .single();

    if (error) throw new Error(`Order creation failed: ${error.message}`);
    orderData = data;
  }

  // 2. Create order items
  const orderItems = cartItems.map(item => ({
    order_id: orderData.id,
    product_id: item.product_id,
    product_name: item.product_name || "Product",
    product_image: item.product_image || null,
    color_id: item.color_id || null,
    color_name: item.color_name || null,
    size_id: item.size_id || null,
    size_name: item.size_name || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price || item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    const minimalItems = cartItems.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: minimalItemsError } = await supabase
      .from("order_items")
      .insert(minimalItems);

    if (minimalItemsError) throw new Error(`Order items failed: ${minimalItemsError.message}`);
  }

  // 3. Update product stock — FIX: use try/catch instead of .catch() on RPC
  for (const item of cartItems) {
    try {
      const { error: rpcError } = await supabase.rpc("decrement_stock", {
        product_id: item.product_id,
        quantity: item.quantity,
      });
      if (rpcError) {
        // Fallback: direct update
        await supabase
          .from("products")
          .update({ stock_quantity: (item.stock_quantity || 0) - item.quantity })
          .eq("id", item.product_id);
      }
    } catch {
      // Silent fallback — stock decrement is non-critical
    }
  }

  // 4. Clear cart
  await supabase.from("cart_items").delete().eq("user_id", userId);

  // 5. Create initial tracking entry — FIX: use try/catch instead of .catch()
  try {
    await supabase.from("order_tracking").insert({
      order_id: orderData.id,
      status: "pending",
      description: "Order received and pending confirmation",
      is_customer_visible: true,
    });
  } catch {
    // Ignore if table doesn't exist
  }

  return {
    order: orderData,
    orderNumber: orderData.order_number || orderData.id,
    total,
    shippingCost,
  };
}

// ─── GET ORDER BY ID ───
export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(*, product:products(name, sku, images:product_images(image_url))),
      tracking:order_tracking(*)
    `)
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

// ─── GET USER ORDERS ───
export async function getUserOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}