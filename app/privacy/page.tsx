import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | RestoreClick",
  description: "Read RestoreClick's privacy policy regarding data collection and usage.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-brand-background text-brand-text min-h-screen py-16 pt-28">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-4">Privacy Policy</h1>
          <div className="w-32 h-px bg-brand-secondary mx-auto mb-6"></div>
          <p className="text-xl text-brand-text/80 max-w-2xl mx-auto leading-relaxed">
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal
            information.
          </p>
        </header>

        <article className="prose prose-lg lg:prose-xl mx-auto text-brand-text prose-headings:font-serif prose-headings:text-brand-text prose-a:text-brand-cta prose-a:hover:text-brand-cta/80 prose-strong:text-brand-text">
          <h2>Introduction</h2>
          <p>
            Welcome to RestoreClick&apos;s Privacy Policy. We are committed to protecting your personal data and your right
            to privacy. If you have any questions or concerns about our policy, or our practices with regard to your
            personal information, please contact us at privacy@restoreclick.com.
          </p>

          <h2>What Information Do We Collect?</h2>
          <h3>Personal Information You Disclose to Us</h3>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the Services,
            express an interest in obtaining information about us or our products and Services, when you participate in
            activities on the Services (such as by posting messages in our online forums or entering competitions), or
            otherwise when you contact us.
          </p>
          <ul>
            <li>
              <strong>Name and Contact Data:</strong> We collect your first and last name, email address, postal address, phone
              number, and other similar contact data.
            </li>
            <li>
              <strong>Credentials:</strong> We collect passwords, password hints, and similar security information used for
              authentication and account access.
            </li>
            <li>
              <strong>Payment Data:</strong> We collect data necessary to process your payment if you make purchases, such as your
              payment instrument number (e.g., a credit card number), and the security code associated with your payment
              instrument. All payment data is stored by our payment processor and you should review its privacy policies
              and contact the payment processor directly to respond to your questions.
            </li>
            <li>
              <strong>Image Data:</strong> When you upload photos for restoration, these images are collected and processed. We treat
              these images with the utmost confidentiality and security.
            </li>
          </ul>

          <h3>Information Automatically Collected</h3>
          <p>
            We automatically collect certain information when you visit, use, or navigate the Services. This information
            does not reveal your specific identity (like your name or contact information) but may include device and
            usage information, such as your IP address, browser and device characteristics, operating system, language
            preferences, referring URLs, device name, country, location, information about how and when you use our
            Services, and other technical information.
          </p>

          <h2>How Do We Use Your Information?</h2>
          <p>
            We use personal information collected via our Services for a variety of business purposes described below.
            We process your personal information for these purposes in reliance on our legitimate business interests, in
            order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal
            obligations.
          </p>
          <ul>
            <li>To facilitate account creation and logon process.</li>
            <li>To send you marketing and promotional communications.</li>
            <li>To fulfill and manage your orders.</li>
            <li>To post testimonials.</li>
            <li>To deliver targeted advertising to you.</li>
            <li>To protect our Services.</li>
            <li>To respond to user inquiries/offer support to users.</li>
            <li>To enable user-to-user communications.</li>
            <li>To manage user accounts.</li>
            <li>To send administrative information to you.</li>
            <li>To enable you to participate in competitions and deliver prizes.</li>
          </ul>

          <h2>Will Your Information Be Shared With Anyone?</h2>
          <p>
            We only share information with your consent, to comply with laws, to provide you with services, to protect
            your rights, or to fulfill business obligations.
          </p>

          <h2>How Long Do We Keep Your Information?</h2>
          <p>
            We keep your information for as long as necessary to fulfill the purposes outlined in this privacy policy
            unless otherwise required by law.
          </p>

          <h2>How Do We Keep Your Information Safe?</h2>
          <p>
            We have implemented appropriate technical and organizational security measures designed to protect the
            security of any personal information we process. However, despite our safeguards and efforts to secure your
            information, no electronic transmission over the Internet or information storage technology can be
            guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other
            unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or
            modify your information.
          </p>

          <h2>What Are Your Privacy Rights?</h2>
          <p>
            You have certain rights under applicable data protection laws. These may include the right to request access
            and obtain a copy of your personal information, to request rectification or erasure, to restrict the
            processing of your personal information, and if applicable, to data portability. In certain circumstances,
            you may also have the right to object to the processing of your personal information.
          </p>

          <h2>Do We Make Updates To This Policy?</h2>
          <p>Yes, we will update this policy as necessary to stay compliant with relevant laws.</p>

          <h2>How Can You Contact Us About This Policy?</h2>
          <p>
            If you have questions or comments about this policy, you may email us at privacy@restoreclick.com or by post
            to:
          </p>
          <p>
            RestoreClick Legal Department<br />
            123 Memory Lane<br />
            Heritage City, HC 90210<br />
            United States
          </p>
        </article>
      </div>
    </div>
  )
}
