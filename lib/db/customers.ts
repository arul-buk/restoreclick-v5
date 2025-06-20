// lib/db/customers.ts
import supabaseAdmin from '@/lib/supabaseAdmin';
import { Database } from '@/lib/database.types';
import logger from '@/lib/logger';

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export interface CreateCustomerInput {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

/**
 * Get or create a customer by email
 */
export async function getOrCreateCustomer(email: string, additionalData?: Partial<CreateCustomerInput>): Promise<Customer> {
  logger.info({ email }, 'Getting or creating customer');
  
  // First, try to find existing customer
  const { data: existingCustomer, error: fetchError } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('email', email)
    .maybeSingle();
    
  if (fetchError) {
    logger.error({ error: fetchError, email }, 'Failed to fetch customer');
    throw fetchError;
  }
  
  if (existingCustomer) {
    logger.info({ customerId: existingCustomer.id, email }, 'Found existing customer');
    
    // Update customer with any new data if provided
    if (additionalData && (additionalData.name || additionalData.phone || additionalData.metadata)) {
      const updateData: CustomerUpdate = {};
      if (additionalData.name) updateData.name = additionalData.name;
      if (additionalData.phone) updateData.phone = additionalData.phone;
      if (additionalData.metadata) {
        updateData.metadata = {
          ...(existingCustomer.metadata as Record<string, any> || {}),
          ...additionalData.metadata
        };
      }
      
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update(updateData)
        .eq('id', existingCustomer.id)
        .select()
        .single();
        
      if (updateError) {
        logger.error({ error: updateError, customerId: existingCustomer.id }, 'Failed to update customer');
        throw updateError;
      }
      
      return updatedCustomer;
    }
    
    return existingCustomer;
  }
  
  // Create new customer
  const customerData: CustomerInsert = {
    email,
    name: additionalData?.name,
    phone: additionalData?.phone,
    metadata: additionalData?.metadata || {}
  };
  
  const { data: newCustomer, error: createError } = await supabaseAdmin
    .from('customers')
    .insert(customerData)
    .select()
    .single();
    
  if (createError) {
    logger.error({ error: createError, email }, 'Failed to create customer');
    throw createError;
  }
  
  logger.info({ customerId: newCustomer.id, email }, 'Created new customer');
  
  return newCustomer;
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();
    
  if (error) {
    logger.error({ error, customerId }, 'Failed to fetch customer by ID');
    throw error;
  }
  
  return customer;
}

/**
 * Update customer information
 */
export async function updateCustomer(customerId: string, updates: CustomerUpdate): Promise<Customer> {
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();
    
  if (error) {
    logger.error({ error, customerId, updates }, 'Failed to update customer');
    throw error;
  }
  
  logger.info({ customerId, updates }, 'Customer updated successfully');
  
  return customer;
}

/**
 * Get customer's order history
 */
export async function getCustomerOrders(customerId: string): Promise<any[]> {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      images (
        id,
        type,
        status,
        public_url,
        storage_path
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
    
  if (error) {
    logger.error({ error, customerId }, 'Failed to fetch customer orders');
    throw error;
  }
  
  return orders || [];
}

/**
 * Search customers by email pattern
 */
export async function searchCustomers(emailPattern: string, limit: number = 10): Promise<Customer[]> {
  const { data: customers, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .ilike('email', `%${emailPattern}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    logger.error({ error, emailPattern }, 'Failed to search customers');
    throw error;
  }
  
  return customers || [];
}
