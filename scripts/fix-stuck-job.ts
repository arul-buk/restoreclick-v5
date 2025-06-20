#!/usr/bin/env tsx

// Script to fix the stuck restoration job
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStuckJob() {
  const jobId = 'b0623ad1-1f1e-43c8-a69e-b2523b1611d7';
  
  console.log(`🔍 Checking job ${jobId}...`);
  
  // Get the job details
  const { data: job, error } = await supabase
    .from('restoration_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
    
  if (error) {
    console.error('❌ Error fetching job:', error);
    return;
  }
  
  if (!job) {
    console.log('❌ Job not found');
    return;
  }
  
  console.log('📋 Job details:', {
    id: job.id,
    status: job.status,
    external_id: job.external_id,
    created_at: job.created_at,
    metadata: job.metadata
  });
  
  // Fix options
  if (!job.external_id && job.status === 'processing') {
    console.log('🔧 Job is stuck in processing without external_id');
    console.log('Options:');
    console.log('1. Mark as failed (recommended)');
    console.log('2. Reset to pending (will retry submission)');
    
    // Option 1: Mark as failed
    const { error: updateError } = await supabase
      .from('restoration_jobs')
      .update({
        status: 'failed',
        error_message: 'Job stuck without external_id - marked as failed by cleanup script',
        metadata: {
          ...job.metadata,
          fixed_by_script: true,
          fixed_at: new Date().toISOString()
        }
      })
      .eq('id', jobId);
      
    if (updateError) {
      console.error('❌ Error updating job:', updateError);
    } else {
      console.log('✅ Job marked as failed - worker will stop trying to poll it');
    }
  }
}

fixStuckJob().catch(console.error);
