export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  coverImage?: string;
  tags?: string[];
}

export interface BlogPostFrontmatter {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  coverImage?: string;
  tags?: string[];
}
