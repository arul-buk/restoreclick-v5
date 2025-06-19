import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | RestoreClick",
  description: "Read RestoreClick's terms of service for using our photo restoration platform.",
}

export default function TermsOfServicePage() {
  return (
    <div className="bg-brand-background text-brand-text min-h-screen py-16 pt-28">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-4">Terms of Service</h1>
          <div className="w-32 h-px bg-brand-secondary mx-auto mb-6"></div>
          <p className="text-xl text-brand-text/80 max-w-2xl mx-auto leading-relaxed">
            These terms and conditions outline the rules and regulations for the use of RestoreClick&apos;s Website.
          </p>
        </header>

        <article className="prose prose-lg lg:prose-xl mx-auto text-brand-text prose-headings:font-serif prose-headings:text-brand-text prose-a:text-brand-cta prose-a:hover:text-brand-cta/80 prose-strong:text-brand-text">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the RestoreClick website and services, you agree to be bound by these Terms of
            Service ("Terms"). If you do not agree to all the terms and conditions of this agreement, then you may not
            access the website or use any services.
          </p>

          <h2>2. Services Provided</h2>
          <p>
            RestoreClick provides digital photo restoration services. This includes, but is not limited to, repairing
            damaged photographs, color correction, enhancement, and digital delivery of restored images.
          </p>

          <h2>3. User Obligations</h2>
          <ul>
            <li>You must be at least 18 years old to use our services.</li>
            <li>
              You agree to provide accurate and complete information when submitting photos or using our contact forms.
            </li>
            <li>
              You warrant that you own the copyright or have permission to use any images you submit for restoration.
            </li>
            <li>You agree not to upload any illegal, offensive, or inappropriate content.</li>
          </ul>

          <h2>4. Payment and Pricing</h2>
          <p>
            All prices for our services are clearly stated on our website. Payment is required before the commencement
            of restoration work, unless otherwise agreed upon. We reserve the right to change our prices at any time,
            but changes will not affect orders already placed.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            Upon completion of the restoration and full payment, you will receive the digital files of your restored
            photos. RestoreClick retains the right to use before-and-after examples of your photos for promotional
            purposes, unless you explicitly opt-out in writing.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            RestoreClick will not be liable for any direct, indirect, incidental, special, consequential, or exemplary
            damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible
            losses resulting from the use or inability to use the service.
          </p>

          <h2>7. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of the jurisdiction where
            RestoreClick is based, without regard to its conflict of law provisions.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is
            material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a
            material change will be determined at our sole discretion.
          </p>

          <h2>9. Contact Information</h2>
          <p>If you have any questions about these Terms, please contact us at legal@restoreclick.com.</p>
        </article>
      </div>
    </div>
  )
}
