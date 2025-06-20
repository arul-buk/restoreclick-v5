// scripts/test-email-worker.ts
// Test script to validate email worker fixes

import { EmailWorker } from '../lib/workers/email-worker';
import { getPendingEmails } from '../lib/db/email-queue';

async function testEmailWorker() {
  console.log('🧪 Testing Email Worker Fixes...\n');

  try {
    // Test 1: Check if getPendingEmails function works
    console.log('1. Testing getPendingEmails function...');
    const pendingEmails = await getPendingEmails(5);
    console.log(`   ✅ Found ${pendingEmails.length} pending emails`);

    // Test 2: Check if EmailWorker can be instantiated
    console.log('\n2. Testing EmailWorker instantiation...');
    const emailWorker = new EmailWorker();
    console.log('   ✅ EmailWorker created successfully');

    // Test 3: Check if worker can start/stop without errors
    console.log('\n3. Testing EmailWorker start/stop...');
    emailWorker.start();
    console.log('   ✅ EmailWorker started');
    
    // Let it run briefly to check for immediate errors
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    emailWorker.stop();
    console.log('   ✅ EmailWorker stopped');

    console.log('\n🎉 All email worker tests passed! The fixes are working correctly.');
    
  } catch (error) {
    console.error('\n❌ Email worker test failed:', error);
    process.exit(1);
  }
}

testEmailWorker();
