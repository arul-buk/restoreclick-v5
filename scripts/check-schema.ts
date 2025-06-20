/**
 * Check the actual database schema for restoration_jobs table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking Database Schema');
  console.log('===========================');

  try {
    // Check restoration_jobs table columns
    console.log('\n1. RESTORATION_JOBS TABLE COLUMNS:');
    const { data: columns, error: columnsError } = await supabase
      .rpc('describe_table', { table_name: 'restoration_jobs' });

    if (columnsError) {
      console.log('   Using alternative method to check columns...');
      
      // Try to get a sample record to see the structure
      const { data: sample, error: sampleError } = await supabase
        .from('restoration_jobs')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Error getting sample:', sampleError);
      } else if (sample && sample.length > 0) {
        console.log('   Sample record columns:');
        Object.keys(sample[0]).forEach(col => {
          console.log(`     - ${col}`);
        });
      } else {
        console.log('   No records found in restoration_jobs table');
      }
    } else {
      console.log('   Columns:', columns);
    }

    // Check email_queue table columns
    console.log('\n2. EMAIL_QUEUE TABLE COLUMNS:');
    const { data: emailSample, error: emailSampleError } = await supabase
      .from('email_queue')
      .select('*')
      .limit(1);

    if (emailSampleError) {
      console.error('❌ Error getting email sample:', emailSampleError);
    } else if (emailSample && emailSample.length > 0) {
      console.log('   Sample record columns:');
      Object.keys(emailSample[0]).forEach(col => {
        console.log(`     - ${col}`);
      });
    } else {
      console.log('   No records found in email_queue table');
    }

    // Check orders table columns
    console.log('\n3. ORDERS TABLE COLUMNS:');
    const { data: orderSample, error: orderSampleError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (orderSampleError) {
      console.error('❌ Error getting order sample:', orderSampleError);
    } else if (orderSample && orderSample.length > 0) {
      console.log('   Sample record columns:');
      Object.keys(orderSample[0]).forEach(col => {
        console.log(`     - ${col}`);
      });
    } else {
      console.log('   No records found in orders table');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSchema();
