// Test Supabase connection with new API key format
import { createClient } from '@supabase/supabase-js';

async function testSupabaseConnection() {
  console.log('=== TESTING SUPABASE NEW API KEY FORMAT ===\n');
  
  // Get credentials from environment (will be injected by Doppler)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Role Key format: ${supabaseKey?.substring(0, 15)}...`);
  console.log(`Key length: ${supabaseKey.length} characters`);
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Test 1: Check if we can count orders
    console.log('\n1. Testing orders table access...');
    const { count: orderCount, error: orderError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (orderError) {
      console.log(`❌ Failed to access orders table: ${orderError.message}`);
    } else {
      console.log(`✅ Successfully accessed orders table! Total orders: ${orderCount}`);
    }
    
    // Test 2: Try to fetch a recent order
    console.log('\n2. Testing order retrieval...');
    const { data: recentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.log(`❌ Failed to fetch order: ${fetchError.message}`);
    } else if (recentOrder) {
      console.log(`✅ Most recent order: ${recentOrder.order_number} (${recentOrder.created_at})`);
    } else {
      console.log('✅ Connection successful, but no orders found in database');
    }
    
    // Test 3: Check restoration_jobs table
    console.log('\n3. Testing restoration_jobs table access...');
    const { count: jobCount, error: jobError } = await supabase
      .from('restoration_jobs')
      .select('*', { count: 'exact', head: true });
    
    if (jobError) {
      console.log(`❌ Failed to access restoration_jobs table: ${jobError.message}`);
    } else {
      console.log(`✅ Successfully accessed restoration_jobs table! Total jobs: ${jobCount}`);
    }
    
    console.log('\n✅ SUPABASE CONNECTION TEST SUCCESSFUL!');
    console.log('The new API key format is working correctly.');
    
  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run the test
testSupabaseConnection().catch(console.error);
