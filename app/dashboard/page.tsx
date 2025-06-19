import Link from "next/link";
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  // Redirect to pricing page since we removed authentication
  return (
    <div className="min-h-screen bg-brand-background text-brand-text p-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="font-serif text-4xl font-bold mb-8">Your Dashboard</h1>
        <p className="text-lg mb-4">Welcome! Here you can manage your account and view your order history.</p>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="font-serif text-2xl font-bold mb-4">Order History</h2>
          <p className="text-brand-text/70">No orders found.</p>
        </div>
      </div>
    </div>
  );
}
