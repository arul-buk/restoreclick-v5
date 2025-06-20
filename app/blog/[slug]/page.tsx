import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getPostBySlug, getAllPostSlugs } from "@/lib/posts"
import { MDXRemote } from 'next-mdx-remote/rsc'
import { format } from 'date-fns'
import Link from "next/link"
import MDXComponents from '@/components/MDXComponents';

// Generate static params for SSG
export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs
}

// Generate metadata for each post
export async function generateMetadata({ 
  params 
}: { 
  params: { slug: string } 
}): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Post Not Found | RestoreClick Blog",
      description: "The requested blog post could not be found.",
    }
  }

  return {
    title: `${post.title} | RestoreClick Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: post.coverImage ? [{
        url: post.coverImage,
        width: 1200,
        height: 630,
        alt: post.title,
      }] : [],
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound()
  }

  // Format the date
  const formattedDate = format(new Date(post.date), 'MMMM d, yyyy')

  return (
    <div className="min-h-screen bg-brand-background py-20 px-4 sm:px-6 lg:px-8">
      <article className="max-w-3xl mx-auto">
        {/* Back to blog link */}
        <div className="mb-8">
          <Link 
            href="/blog" 
            className="inline-flex items-center text-brand-cta hover:underline"
          >
            <svg 
              className="w-4 h-4 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18" 
              />
            </svg>
            Back to Blog
          </Link>
        </div>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-brand-text mb-6">
            {post.title}
          </h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center text-gray-600 text-sm sm:text-base">
            <div className="flex items-center mb-2 sm:mb-0 sm:mr-6">
              <span className="font-medium text-gray-900 mr-2">By:</span>
              <span>{post.author}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-gray-900 mr-2">Published:</span>
              <time dateTime={post.date}>{formattedDate}</time>
            </div>
          </div>

          {post.coverImage && (
            <div className="relative h-64 md:h-96 w-full mt-8 rounded-xl overflow-hidden shadow-lg">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                priority
              />
            </div>
          )}
        </header>

        <div className="prose prose-lg max-w-none">
          <MDXRemote 
            source={post.content}
            components={MDXComponents}
          />
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <Link 
              href="/blog" 
              className="inline-flex items-center text-brand-cta hover:underline"
            >
              <svg 
                className="w-4 h-4 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Back to Blog
            </Link>
            
            {/* Add social sharing buttons here if needed */}
          </div>
        </footer>
      </article>
    </div>
  )
}
