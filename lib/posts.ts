import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { parseISO } from 'date-fns';
import { BlogPost, BlogPostFrontmatter } from '@/types/blog';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export async function getAllPosts(): Promise<BlogPost[]> {
  try {
    // Get file names under /posts
    const fileNames = (await fs.readdir(postsDirectory)).filter(fileName => fileName.endsWith('.mdx'));
    
    // Process all posts in parallel
    const allPostsData = await Promise.all(
      fileNames.map(async (fileName) => {
        try {
          // Remove ".mdx" from file name to get id
          const slug = fileName.replace(/\.mdx$/, '');

          // Read markdown file as string
          const fullPath = path.join(postsDirectory, fileName);
          const fileContents = await fs.readFile(fullPath, 'utf8');

          // Use gray-matter to parse the post metadata section
          const { data, content } = matter(fileContents);

          // Combine the data with the id and content
          const parsedDate = parseISO(data.date);
          return {
            slug,
            content,
            date: parsedDate.toISOString(),
            ...(data as Omit<BlogPostFrontmatter, 'slug' | 'content' | 'date'>),
          };
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed posts and sort by date
    return allPostsData
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (error) {
    console.error('Error reading posts directory:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    const fileContents = await fs.readFile(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    const parsedDate = parseISO(data.date);

    return {
      slug,
      content,
      date: parsedDate.toISOString(),
      ...(data as Omit<BlogPostFrontmatter, 'slug' | 'content' | 'date'>),
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

export async function getAllPostSlugs() {
  try {
    const fileNames = await fs.readdir(postsDirectory);
    return fileNames.map((fileName) => ({
      params: {
        slug: fileName.replace(/\.mdx$/, ''),
      },
    }));
  } catch (error) {
    console.error('Error getting post slugs:', error);
    return [];
  }
}
