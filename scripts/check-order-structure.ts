// scripts/check-order-structure.ts
import { getOrderById } from '../lib/db/orders';

async function checkOrderStructure() {
  const order = await getOrderById('4ff4b481-cd35-485a-9fcc-4830219be60c');
  if (order) {
    console.log('Order structure:');
    console.log('- order.id:', order.id);
    console.log('- order.order_number:', order.order_number);
    console.log('- order.customer_id:', order.customer_id);
    console.log('- order.customers exists:', !!order.customers);
    if (order.customers) {
      console.log('- order.customers.name:', order.customers.name);
      console.log('- order.customers.email:', order.customers.email);
    }
    console.log('- order.customer_name (direct):', order.customer_name);
    console.log('- order.customer_email (direct):', order.customer_email);
  } else {
    console.log('Order not found');
  }
}

checkOrderStructure();
