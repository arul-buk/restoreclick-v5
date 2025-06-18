"use client"

import { useState } from "react"
import { PostCard } from "@/components/blog/PostCard"
import { BlogPost } from "@/types/blog"

interface BlogListingClientProps {
  initialPosts: BlogPost[]
}

export default function BlogListingClient({ initialPosts }: BlogListingClientProps) {
  const [posts] = useState<BlogPost[]>(initialPosts)
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading blog posts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-brand-text mb-4 font-serif">Our Blog</h1>
          <p className="text-xl text-brand-text/80">Insights, stories, and tips about photo restoration</p>
        </div>
        
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">No blog posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
