// app/account/page.tsx
// This is a Server Component, meaning it runs on the server.
// It fetches data directly from the database and renders the UI.

import { redirect } from 'next/navigation';

export default async function AccountPage() {
  // Redirect to home page since we removed authentication
  redirect('/');
}