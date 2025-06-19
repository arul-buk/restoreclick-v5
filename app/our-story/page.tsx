import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Our Story | RestoreClick",
  description:
    "The story of how a personal mission to save a single photograph became the foundation of our white-glove restoration service.",
}

export default function OurStoryPage() {
  return (
    <div className="bg-brand-background text-brand-text">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] w-full">
        <Image
          src="/images/hero-background.jpg"
          alt="Founder Lily and her grandmother Eleanor"
          fill
          className="object-cover brightness-75"
          />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container mx-auto px-6 text-center text-white">
            <h2 className="font-serif text-3xl font-normal text-brand-text mb-4">Let's Restore Your Memories</h2>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-6 py-16 md:py-24">
        <article className="prose prose-lg lg:prose-xl mx-auto text-brand-text prose-headings:font-serif prose-headings:text-brand-text">
          <p className="text-xl text-brand-text/80 leading-relaxed mb-8">Ready to see your cherished photos in a new light? We&apos;d be honored to restore them for you.</p>
          <p className="lead">
            It began in the quiet of my grandmother's living room, a place filled with the scent of old books and warm
            tea. I watched her stand by the mantelpiece, her hand gently tracing the frame of a portrait of my late
            grandfather, Arthur. It was a photo I had seen a thousand times, but that day, I saw it through her eyes. It
            had become a ghost of its former self. The brilliant blue of his eyes had faded to a hazy grey; his warm,
            familiar smile was a blurry suggestion.
          </p>

          <p>
            That stark realization felt like a second, slower loss. It wasn&apos;t just a photograph that was vanishing
            before our eyes—it was a tangible piece of our family&apos;s history, the very essence of the man she loved,
            disappearing pixel by painful pixel.
          </p>
          
          <div className="my-12 md:my-16 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p>
                That quiet heartbreak sparked a relentless pursuit. This was no longer an abstract technical challenge;
                it was a deeply personal mission. I spent countless late nights not just coding, but trying to teach an
                AI to see with a human heart. I wanted it to understand the subtle curve of a loving smile, the specific
                warmth of 1970s film, the way light catches in a joyful eye.
              </p>
              <p>
                It became an obsession with detail, a quest to find a technology that could not just repair damage, but
                resurrect the very soul of a photograph. Every line of code was written with a single image in mind: my
                grandmother&apos;s face when she would see her husband&apos;s portrait, whole and vibrant, once more. It was a
                mission to achieve perfection for a memory that was priceless.
              </p>
            </div>
            <div className="relative aspect-[2/3] w-full">
              <Image
                src="/images/lilywork.jpg"
                alt="Eleanor holding the restored portrait of her husband"
                fill
                className="object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>

          <div className="my-12 md:my-16 grid md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[2/3] w-full">
              <Image
                src="/images/nanahappy.jpg"
                alt="Founder Lily carefully examining a restored photograph"
                fill
                className="object-cover rounded-lg shadow-xl"
              />
            </div>
            <div>
              <p>
                The moment of truth came on a quiet afternoon, back in that same living room. I handed my grandmother a
                simple tablet, my own heart pounding. On the screen was the restored portrait. The silence was absolute as
                she put on her glasses and looked down.
              </p>
              <p>
                There was a soft, sharp intake of breath. Her hand came up to her mouth, and her eyes, wide with disbelief,
                filled with light. A single tear traced a path down her cheek as she whispered, &quot;That&apos;s him. That&apos;s the
                blue.&quot; She touched the screen as if she could feel him there. In that instant, all the late nights, all the
                obsession, all the work became worth it. We hadn&apos;t just restored a photo; we had brought a presence back
                into the room.
              </p>
            </div>
          </div>

          <div className="my-12 md:my-16 grid md:grid-cols-2 gap-12 items-center">
            <p>
              That single tear of joy was the true beginning of RestoreClick. What started as a personal project to
              honor one man&apos;s memory evolved into something more. That moment taught me that this feeling—this profound
              sense of reconnection and peace—was a universal need.
            </p>
            <div className="relative aspect-[2/3] w-full order-last md:order-first">
              <Image
                src="/images/lily-nana.jpg"
                alt="Eleanor holding the restored portrait of her husband"
                fill
                className="object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>

          <p>
            We built this service grounded in the unwavering belief that every family deserves to see their history in
            its most vibrant, complete form. We are here to give that moment back to you.
          </p>

          {/* Founder's Note */}
          <div className="mt-20 md:mt-28 border-t border-brand-text/10 pt-12">
            <h2 className="font-serif text-3xl">A Note from Our Founder, Lily.</h2>
            <p>
              &quot;For me, every photograph is a piece of history. My grandfather&apos;s portrait taught me that restoration is
              not a technical process, but an act of preservation. My commitment is to bring that same level of
              dedication and artistry to your family&apos;s legacy.&quot;
            </p>
            <p className="text-lg text-brand-text/80 leading-relaxed">Our process is a blend of cutting-edge AI and meticulous human artistry. We don&apos;t believe in a &quot;one-click&quot; fix. Each photo is assessed and restored by a real person, ensuring the final result is not just technically perfect, but emotionally resonant. We&apos;re committed to ethical restoration, preserving the original character of your memories while gently healing the damage of time.</p>
            <div className="mt-4">
              <Image
                src="/images/lilysign.png"
                alt="Lily's signature"
                width={150}
                height={75}
                className="opacity-80"
              />
             
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
