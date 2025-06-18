import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge" // Assuming you have a Badge component or will create one

interface BlogPostCardProps {
  post: {
    slug: string
    title: string
    date: string
    description: string
    coverImage: string
    categories: string[] // Added categories
  }
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <Card className="overflow-hidden shadow-soft hover:shadow-soft-md transition-shadow duration-300 h-full flex flex-col">
        <div className="relative aspect-[3/2] w-full overflow-hidden">
          <Image
            src={post.coverImage || "/placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <CardContent className="p-8 flex flex-col flex-grow">
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="bg-brand-secondary/20 text-brand-secondary text-xs px-2 py-1 rounded-full"
              >
                {category}
              </Badge>
            ))}
          </div>
          <p className="text-base text-brand-text/80 mb-2">{post.date}</p>
          <h3 className="font-serif text-2xl font-semibold text-brand-text group-hover:text-brand-cta transition-colors mb-3 leading-tight">
            {post.title}
          </h3>
          <p className="text-brand-text/80 text-lg leading-relaxed flex-grow">{post.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
