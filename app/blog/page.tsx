import type { Metadata } from "next" // Metadata is still exported from server component
import BlogListingClient from "./BlogListingClient"
import { getAllPosts } from "@/lib/posts";

// Metadata is typically defined in a server component, but for a client component
// that fetches data, you might define it in a layout or a parent server component.
// For simplicity in this example, we'll keep it here, but note the "use client" implication.
export const metadata = {
  title: "Blog - RestoreClick",
  description: "Read our latest articles about photo restoration and digital archiving.",
};

export default async function BlogPage() {
  // Fetch posts on the server side
  const posts = await getAllPosts();
  
  return <BlogListingClient initialPosts={posts} />;
}

// Revalidate this page every 60 seconds
export const revalidate = 60;
