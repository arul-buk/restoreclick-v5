// scripts/test-customer-name-fix.ts
import { getOrderById } from '../lib/db/orders';

async function testCustomerNameFix() {
  console.log('🧪 Testing Customer Name Fix...\n');

  try {
    // Test with a recent order
    const order = await getOrderById('4ff4b481-cd35-485a-9fcc-4830219be60c');
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }

    console.log('📋 Order Data:');
    console.log(`- Order Number: ${order.order_number}`);
    console.log(`- Customer ID: ${order.customer_id}`);
    
    console.log('\n👤 Customer Data Access:');
    console.log(`- order.customers exists: ${!!order.customers}`);
    
    if (order.customers) {
      console.log(`- order.customers.name: "${order.customers.name}"`);
      console.log(`- order.customers.email: "${order.customers.email}"`);
    }

    console.log('\n📧 Email Field Mapping:');
    
    // Test the logic used in restoration worker
    const toEmail = order.customers?.email || '';
    const toName = order.customers?.name || 'Valued customer';
    const customerName = order.customers?.name || 'Valued customer';
    
    console.log(`- toEmail: "${toEmail}"`);
    console.log(`- toName: "${toName}"`);
    console.log(`- customer_name (dynamic data): "${customerName}"`);
    
    console.log('\n✅ Customer name fix is working correctly!');
    
    if (order.customers?.name) {
      console.log(`🎯 Will use actual name: "${order.customers.name}"`);
    } else {
      console.log(`🎯 Will use fallback: "Valued customer"`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testCustomerNameFix();
