// lib/blog-posts.ts
import { marked } from 'marked';

export interface BlogPost {
  id: string
  slug: string
  title: string
  date: string // Format: "Month Day, Year"
  description: string
  coverImage: string // Placeholder URL
  author: string
  content: string // Markdown content
  readingTime: number // In minutes
  categories: string[] // New: Array of categories
}

// Simple function to calculate reading time (approx. 200 words per minute)
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const wordCount = text.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}

const mockBlogPostsData = [
  {
    id: "1",
    slug: "the-art-of-digital-restoration",
    title: "The Art of Digital Restoration: Bringing Memories Back to Life",
    date: "October 26, 2023",
    description:
      "Discover the meticulous process our digital artisans use to transform faded, damaged photographs into vibrant, lasting heirlooms.",
    coverImage: "/placeholder.jpg", // Crimson
    author: "Lily Chen",
    categories: ["Restoration", "Technology"],
    content: `
# The Art of Digital Restoration: Bringing Memories Back to Life

In an age where digital photography dominates, there's a unique charm and irreplaceable value in physical photographs. They are tangible links to our past, holding stories, emotions, and the faces of loved ones. However, time, neglect, and accidents can take their toll, leaving these precious artifacts faded, torn, or discolored. This is where the art of digital photo restoration comes in.

## What is Digital Photo Restoration?

Digital photo restoration is the process of repairing and enhancing old or damaged photographs using digital tools and techniques. It's not just about fixing flaws; it's about breathing new life into an image, bringing it back to its original glory, or even improving upon it.

### The Meticulous Process

Our approach to digital restoration is a blend of advanced technology and human artistry. Each photograph undergoes a meticulous, multi-step process:

1.  **Initial Assessment**: We begin by carefully analyzing the photograph's condition, identifying all damage, from minor dust spots to severe tears, fading, and discoloration. This helps us determine the best restoration strategy.
2.  **Scanning and Digitization**: The physical photograph is high-resolution scanned to create a digital copy. This step is crucial as it captures every detail, allowing for precise work without further damaging the original.
3.  **Damage Repair**: This is often the most time-consuming phase. Our digital artisans use specialized software to:
    *   Remove scratches, dust, and blemishes.
    *   Repair tears, creases, and missing sections.
    *   Reconstruct damaged areas, often by borrowing elements from other parts of the photo or similar images.
4.  **Color Correction and Enhancement**: Faded colors are revived, and color casts are neutralized. We adjust brightness, contrast, and saturation to ensure the image looks natural and vibrant.
5.  **Sharpening and Detail Enhancement**: We carefully enhance details that may have been lost due to blurriness or low resolution, bringing clarity to faces and textures.
6.  **Final Review**: Before delivery, each restored image undergoes a rigorous quality check to ensure it meets our museum-quality standards and exceeds your expectations.

## Why Restore Your Photos?

Restoring your photographs is an investment in your family's legacy. It allows you to:

*   **Preserve History**: Safeguard irreplaceable moments and ensure they can be passed down through generations.
*   **Relive Memories**: See your loved ones and past events as they truly were, with clarity and vibrancy.
*   **Create New Art**: Transform old photos into stunning pieces of art for display in your home.

At RestoreClick, we understand the emotional value embedded in every photograph. Our commitment is to treat your memories with the utmost care and artistry, ensuring they are perfectly preserved for years to come.
`,
  },
  {
    id: "2",
    slug: "preserving-your-family-legacy",
    title: "Preserving Your Family Legacy: Why Photo Restoration Matters",
    date: "November 10, 2023",
    description:
      "Learn how restoring old photographs can help you connect with your roots, share stories with future generations, and honor your family's history.",
    coverImage: "/placeholder.jpg", // SteelBlue
    author: "David Lee",
    categories: ["Family History", "Legacy"],
    content: `
# Preserving Your Family Legacy: Why Photo Restoration Matters

Old photographs are more than just images; they are windows into our family's past, silent storytellers of lives lived, and precious links to our heritage. Restoring these fading treasures is not merely an act of preservation; it's an act of love, a way to honor those who came before us and to share their stories with generations to come.

## The Power of a Restored Photograph

A faded, torn, or discolored photograph can obscure the vibrant reality it once captured. Restoration peels back the layers of time, revealing:

*   **Clarity and Detail**: See the twinkle in an ancestor's eye, the intricate pattern of a wedding dress, or the subtle expressions that tell a deeper story.
*   **Emotional Connection**: A clear, restored image can evoke powerful emotions, making historical figures feel more real and relatable.
*   **Historical Context**: Restored photos can provide valuable insights into the fashion, customs, and environments of the past.

## Connecting with Your Roots

For many, exploring family history is a journey of self-discovery. Restored photographs play a crucial role in this journey:

*   **Visualizing Ancestors**: Putting a clear face to a name on a family tree can transform abstract genealogical data into a tangible connection.
*   **Understanding Family Traits**: Sometimes, physical resemblances or expressions can be seen across generations, highlighting the threads that connect us.
*   **Inspiring Curiosity**: A beautifully restored photo can spark conversations and encourage younger family members to learn about their heritage.

## Sharing with Future Generations

One of the most compelling reasons to restore old photos is to ensure they can be shared and appreciated by future generations:

*   **Creating Lasting Heirlooms**: Digital restoration creates high-quality files that can be easily duplicated, shared, and printed, safeguarding them against further physical deterioration.
*   **Enriching Family Stories**: Use restored photos to illustrate family narratives, creating engaging albums, slideshows, or online galleries.
*   **Passing on Values**: The act of preserving and sharing these memories demonstrates the importance of family history and connection.

At RestoreClick, we believe that every family's story deserves to be told with clarity and vibrancy. Let us help you preserve your legacy, one precious photograph at a time.
`,
  },
  {
    id: "3",
    slug: "choosing-the-right-service",
    title: "Choosing the Right Restoration Service: What to Look For",
    date: "November 25, 2023",
    description:
      "Not all photo restoration services are created equal. This guide helps you identify key factors to consider when entrusting your cherished memories to a professional.",
    coverImage: "/placeholder.jpg", // LimeGreen
    author: "Maria Garcia",
    categories: ["Tips", "Professional Services"],
    content: `
# Choosing the Right Restoration Service: What to Look For

Your old photographs are invaluable, holding irreplaceable memories. When it comes to restoring them, you want to ensure they are in the hands of skilled professionals who will treat them with the care and expertise they deserve. Here’s what to look for when choosing a photo restoration service:

## 1. Quality of Work and Portfolio

The most crucial factor is the quality of the restoration work.

*   **Portfolio**: A strong portfolio showcasing a variety of before-and-after examples is essential. Look for diverse types of damage (tears, fading, water damage, mold) and different photographic eras.
*   **Attention to Detail**: Do the restorations look natural? Are details preserved and enhanced, or do they look overly processed or artificial?
*   **Artisan Skill**: Does the service emphasize the role of human artisans alongside technology? The best results come from a blend of advanced AI tools and the discerning eye of a skilled professional.

## 2. Transparency in Process and Pricing

A reputable service will be transparent about their methods and costs.

*   **Clear Communication**: They should explain their restoration process, what they can achieve, and any limitations.
*   **Itemized Quotes**: Pricing should be clear and, if possible, itemized based on the level of damage and work required. Beware of services that are vague about costs.
*   **Turnaround Time**: While quality shouldn't be rushed, they should provide a realistic estimate for completion.

## 3. Customer Service and Guarantees

Good customer service indicates a commitment to client satisfaction.

*   **Responsiveness**: How quickly and thoroughly do they respond to inquiries?
*   **Consultation**: Do they offer a consultation to discuss your specific photos and needs?
*   **Revision Policy**: What if you're not entirely happy with the initial restoration? Do they offer revisions?
*   **Satisfaction Guarantee**: A confident service will offer a satisfaction guarantee, ensuring you are happy with the final result.

## 4. Security and Care for Originals

If you're sending physical photos, their safe handling is critical.

*   **Secure Handling**: Inquire about their procedures for receiving, storing, and returning your original photographs.
*   **Digital Copies**: Confirm that they create high-quality digital scans and that your originals are not altered in any way.
*   **Data Privacy**: If uploading digital files, ensure they have a clear privacy policy regarding your images.

Choosing the right photo restoration service is an investment in preserving your most precious memories. By considering these factors, you can find a provider like RestoreClick that combines technical skill, artistic talent, and a genuine commitment to honoring your family's legacy.
`,
  },
  {
    id: "4",
    slug: "beyond-the-frame-creative-display",
    title: "Beyond the Frame: Creative Ways to Display Restored Photos",
    date: "December 5, 2023",
    description:
      "Your beautifully restored photos deserve to be seen! Explore unique and inspiring ideas for displaying your cherished memories throughout your home.",
    coverImage: "/placeholder.jpg", // Gold
    author: "Alex Johnson",
    categories: ["Display", "Home Decor"],
    content: `
# Beyond the Frame: Creative Ways to Display Restored Photos

You've invested in restoring your precious family photographs, bringing them back to their former glory. Now, don't let them languish on a hard drive! Displaying your restored memories can bring warmth, personality, and a sense of history to your home. Here are some creative ideas to get you started:

## 1. Curated Gallery Walls

A gallery wall is a classic and versatile way to showcase a collection of photos.

*   **Mix and Match**: Combine different sizes, frame styles, and orientations for an eclectic look. You can mix restored photos with newer family pictures or even art prints.
*   **Thematic Groupings**: Group photos by family branch, time period, or special occasions.
*   **Grid Layout**: For a more modern and uniform look, use identical frames and arrange them in a precise grid.

## 2. Storytelling Photo Albums & Books

Digital printing services make it easy to create high-quality photo books.

*   **Heirloom Quality**: Choose archival-quality paper and binding for a book that will last for generations.
*   **Narrative Flow**: Arrange photos chronologically or thematically, adding captions and anecdotes to tell a richer story.
*   **Gift Ideas**: A beautifully printed album of restored photos makes an incredibly thoughtful and personal gift for family members.

## 3. Large-Format Art Prints

Turn a single, particularly striking restored photograph into a statement piece.

*   **Canvas Prints**: Offer a textured, artistic feel.
*   **Metal Prints**: Provide a sleek, modern look with vibrant colors.
*   **Framed Enlargements**: A classic choice that can be tailored to any decor style. Consider museum-quality glass to protect the print.

## 4. Digital Displays

For a dynamic and space-saving option, use digital photo frames.

*   **Rotating Slideshow**: Enjoy a constantly changing display of your favorite restored images.
*   **Easy Updates**: Add new photos to the rotation as you restore more of your collection.
*   **Smart Frames**: Some frames can be updated remotely, making it easy to share memories with family members who live far away.

## 5. Personalized Decor Items

Incorporate your restored photos into everyday items for a unique touch.

*   **Custom Calendars**: A practical and personal way to enjoy your photos throughout the year.
*   **Photo Coasters or Mugs**: A subtle way to integrate memories into everyday items.
*   **Custom Textiles**: Print a favorite restored image onto a throw pillow or blanket.
*   **Shadow Boxes**: Combine a restored photo with small family heirlooms or mementos for a three-dimensional display.

No matter how you choose to display them, your restored photographs will serve as beautiful reminders of your family's journey and the enduring power of memory. Let RestoreClick help you bring those memories to light.
`,
  },
  {
    id: "5",
    slug: "ai-in-photo-restoration-future",
    title: "The Future of Memory: AI's Role in Photo Preservation",
    date: "December 20, 2023",
    description:
      "Explore how Artificial Intelligence is revolutionizing photo restoration, making it more accessible and precise, while still honoring the art of human touch.",
    coverImage: "/placeholder.jpg", // Orchid
    author: "Dr. Evelyn Reed",
    categories: ["Technology", "Future"],
    content: `
# The Future of Memory: AI's Role in Photo Preservation

For decades, photo restoration was a painstaking, manual process, requiring immense skill and time from trained artists. While human artistry remains invaluable, the advent of Artificial Intelligence (AI) is revolutionizing the field, making high-quality photo preservation more accessible, efficient, and precise than ever before.

## AI as a Digital Artisan's Assistant

At RestoreClick, we view AI not as a replacement for human expertise, but as a powerful assistant to our digital artisans. AI algorithms can perform repetitive and complex tasks with incredible speed and accuracy, freeing up our experts to focus on the nuanced, artistic decisions that truly bring a photo back to life.

### How AI is Transforming Restoration:

1.  **Automated Damage Detection**: AI can quickly scan an image and identify various types of damage—scratches, dust, tears, and even areas of severe fading—with a precision that would take a human eye much longer to achieve.
2.  **Intelligent Inpainting and Reconstruction**: For missing or severely damaged areas, advanced AI models can "inpain" or intelligently fill in gaps by analyzing surrounding pixels and predicting what the missing content should look like. This is particularly powerful for reconstructing faces or intricate patterns.
3.  **Realistic Colorization**: Black and white photos can be colorized with remarkable realism. AI models trained on vast datasets of images can infer natural colors for skin tones, landscapes, and objects, adding a new dimension to historical photographs.
4.  **Enhanced Detail and Sharpening**: AI-powered super-resolution techniques can upscale low-resolution images and enhance fine details without introducing artifacts, making old, blurry photos surprisingly clear.
5.  **Fading and Discoloration Correction**: AI can analyze color shifts caused by age and light exposure, then intelligently correct them to restore the original vibrancy and tone of the photograph.

## The Ethical Considerations

While AI offers incredible potential, it also raises important ethical questions. At RestoreClick, we are committed to using AI responsibly:

*   **Preserving Authenticity**: Our goal is to restore, not to alter history. AI is used to bring back what was lost, not to invent new elements or distort the original intent of the photograph.
*   **Human Oversight**: Every AI-enhanced restoration undergoes rigorous human review by our skilled artisans. This ensures artistic integrity and addresses any subtle imperfections that AI might miss.
*   **Transparency**: We believe in being transparent about our use of AI, educating our clients on how technology assists in achieving superior results.

The future of memory preservation is bright, with AI playing an increasingly vital role. By combining cutting-edge artificial intelligence with the irreplaceable touch of human artistry, RestoreClick is dedicated to ensuring that your family's most cherished moments are preserved with unparalleled quality and care for generations to come.
`,
  },
]

export async function getBlogPosts(): Promise<BlogPost[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100))
  return mockBlogPostsData.map((post) => ({
    ...post,
    content: marked(post.content) as string, // Convert Markdown to HTML
    readingTime: calculateReadingTime(post.content), // Calculate reading time from original Markdown
  }))
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100))
  const post = mockBlogPostsData.find((p) => p.slug === slug)
  if (!post) return null
  return {
    ...post,
    content: marked(post.content) as string, // Convert Markdown to HTML
    readingTime: calculateReadingTime(post.content), // Calculate reading time from original Markdown
  }
}

export async function getUniqueBlogCategories(): Promise<string[]> {
  const posts = await getBlogPosts()
  const categories = new Set<string>()
  posts.forEach((post) => {
    post.categories.forEach((category) => categories.add(category))
  })
  return Array.from(categories).sort()
}
