// lib/db/orders.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import type { Database } from '@/lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];
type OrderStatus = Database['public']['Enums']['order_status_enum'];
type PaymentStatus = Database['public']['Enums']['payment_status_enum'];

export interface CreateOrderInput {
  customerId: string;
  stripePaymentIntentId: string;
  stripeCheckoutSessionId?: string;
  totalAmount: number;
  currency?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate a unique order number in format YYYYMMDD-NNNNNN
 */
export async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('generate_order_number');
  
  if (error) {
    logger.error({ error }, 'Failed to generate order number');
    throw error;
  }
  
  return data;
}

/**
 * Create a new order
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  logger.info({ customerId: input.customerId, amount: input.totalAmount }, 'Creating new order');
  
  const orderNumber = await generateOrderNumber();
  
  const orderData: OrderInsert = {
    order_number: orderNumber,
    customer_id: input.customerId,
    status: 'processing',
    payment_status: 'paid',
    stripe_payment_intent_id: input.stripePaymentIntentId,
    stripe_checkout_session_id: input.stripeCheckoutSessionId,
    total_amount: input.totalAmount,
    currency: input.currency || 'USD',
    subtotal: input.subtotal,
    tax_amount: input.taxAmount || 0,
    discount_amount: input.discountAmount || 0,
    payment_method: input.paymentMethod,
    paid_at: new Date().toISOString(),
    metadata: input.metadata || {}
  };
  
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert(orderData)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, orderData }, 'Failed to create order');
    throw error;
  }
  
  logger.info({ orderId: order.id, orderNumber: order.order_number }, 'Order created successfully');
  
  return order;
}

/**
 * Get order by ID with related data
 */
export async function getOrderById(orderId: string): Promise<any | null> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      customers (*),
      images (
        id,
        type,
        status,
        storage_path,
        public_url,
        file_size_bytes,
        mime_type,
        parent_image_id,
        processing_started_at,
        processing_completed_at,
        metadata
      ),
      email_queue (
        id,
        email_type,
        status,
        to_email,
        sent_at,
        error_message
      )
    `)
    .eq('id', orderId)
    .maybeSingle();
    
  if (error) {
    logger.error({ error, orderId }, 'Failed to fetch order');
    throw error;
  }
  
  return order;
}

/**
 * Get order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<any | null> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      customers (*),
      images (
        id,
        type,
        status,
        storage_path,
        public_url,
        file_size_bytes,
        mime_type,
        parent_image_id,
        metadata
      )
    `)
    .eq('order_number', orderNumber)
    .maybeSingle();
    
  if (error) {
    logger.error({ error, orderNumber }, 'Failed to fetch order by number');
    throw error;
  }
  
  return order;
}

/**
 * Get order by Stripe checkout session ID
 */
export async function getOrderByCheckoutSession(checkoutSessionId: string): Promise<Order | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('stripe_checkout_session_id', checkoutSessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting order by checkout session:', error);
    throw error;
  }
}

/**
 * Get order by Stripe payment intent ID
 */
export async function getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting order by payment intent:', error);
    throw error;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus, metadata?: Record<string, any>): Promise<Order> {
  const updateData: OrderUpdate = { status };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }
  
  if (metadata) {
    // Get current metadata and merge
    const { data: currentOrder } = await supabaseAdmin
      .from('orders')
      .select('metadata')
      .eq('id', orderId)
      .single();
      
    updateData.metadata = {
      ...(currentOrder?.metadata as Record<string, any> || {}),
      ...metadata
    };
  }
  
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, orderId, status }, 'Failed to update order status');
    throw error;
  }
  
  logger.info({ orderId, status }, 'Order status updated');
  
  return order;
}

/**
 * Check if order is complete (all restoration jobs finished)
 */
export async function checkOrderCompletion(orderId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_order_completion', {
    order_uuid: orderId
  });
  
  if (error) {
    logger.error({ error, orderId }, 'Failed to check order completion');
    throw error;
  }
  
  return data;
}

/**
 * Get orders with filters
 */
export async function getOrders(filters: {
  status?: OrderStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> {
  let query = supabaseAdmin
    .from('orders')
    .select(`
      *,
      customers (email, name)
    `);
    
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }
  
  query = query.order('created_at', { ascending: false });
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
  }
  
  const { data: orders, error } = await query;
  
  if (error) {
    logger.error({ error, filters }, 'Failed to fetch orders');
    throw error;
  }
  
  return orders || [];
}

/**
 * Get order statistics
 */
export async function getOrderStats(): Promise<{
  total: number;
  processing: number;
  completed: number;
  failed: number;
  totalRevenue: number;
}> {
  const [totalResult, processingResult, completedResult, failedResult, revenueResult] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabaseAdmin.from('orders').select('total_amount').eq('payment_status', 'paid')
  ]);
  
  const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  
  return {
    total: totalResult.count || 0,
    processing: processingResult.count || 0,
    completed: completedResult.count || 0,
    failed: failedResult.count || 0,
    totalRevenue
  };
}
