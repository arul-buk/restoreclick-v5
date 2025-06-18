import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server"; // Import auth for server-side user ID
import { createClient } from '@/utils/supabase/server'; // Import Supabase client
import Link from "next/link";
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const supabase = createClient();
  const { userId } = auth();

  let orders = [];
  if (userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      orders = data;
    }
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text p-6">
      <SignedIn>
        <div className="container mx-auto max-w-4xl">
          <h1 className="font-serif text-4xl font-bold mb-8">Your Dashboard</h1>
          <p className="text-lg mb-4">Welcome! Here you can manage your account and view your order history.</p>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="font-serif text-2xl font-bold mb-4">Order History</h2>
            {orders.length > 0 ? (
              <ul className="space-y-4">
                {orders.map((order: any) => (
                  <li key={order.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                    <p className="text-lg font-semibold">Order ID: {order.id}</p>
                    <p className="text-sm text-brand-text/70">Amount: ${order.amount / 100}</p>
                    <p className="text-sm text-brand-text/70">Status: {order.status}</p>
                    <p className="text-sm text-brand-text/70">Date: {new Date(order.created_at).toLocaleDateString()}</p>
                    {order.image_batch_id && (
                      <Link href={`/payment-success?batch_id=${order.image_batch_id}`}>
                        <Button variant="link" className="p-0 h-auto text-brand-primary">View Restorations</Button>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-brand-text/70">No orders found.</p>
            )}
          </div>
          <div className="mt-8">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg mb-6">Please sign in to view your dashboard.</p>
          <Link href="/sign-in">
            <button className="bg-brand-cta hover:bg-brand-cta/90 text-white font-bold py-2 px-4 rounded">Sign In</button>
          </Link>
        </div>
      </SignedOut>
    </div>
  );
}
