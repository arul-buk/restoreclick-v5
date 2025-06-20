# RestoreClickV4 - AI Photo Restoration Platform

RestoreClickV4 is a comprehensive Next.js application that uses AI to restore old and damaged photos, featuring Google Tag Manager integration, comprehensive analytics tracking, and a modern user experience.

## 🚀 Latest Updates

### ✅ Recently Completed
- **Google Tag Manager Integration**: Complete analytics tracking across all user interactions
- **Build Error Fixes**: Resolved TypeScript compilation errors and environment configuration
- **Analytics Events**: Page views, user engagement, photo operations, purchases, and error tracking
- **Payment Success Redesign**: Interactive before/after viewer with sharing capabilities
- **Comprehensive Testing**: Unit tests, integration tests, and E2E testing framework

### ⚠️ Current Status
- **Build Status**: Compiles successfully with Next.js warnings (useSearchParams Suspense boundaries)
- **Deployment Ready**: Core functionality working, optimization warnings remain
- **Analytics Ready**: GTM integration complete, requires container configuration

## 🛠 Core Technologies

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase Edge Functions
- **AI Processing**: Replicate API for photo restoration
- **Database & Storage**: Supabase (PostgreSQL + Storage)
- **Payments**: Stripe with webhook integration
- **Email**: SendGrid with template management
- **Analytics**: Google Tag Manager integration
- **Testing**: Vitest, Playwright for E2E testing
- **Deployment**: Vercel-ready with environment configuration

## Getting Started

1.  **Clone the repository.**
2.  **Set up Environment Variables with Doppler:**
    - Ensure you have Doppler CLI installed and configured.
    - Run `doppler setup` and connect to the RestoreClick project.
    - Local development typically uses `doppler run -- npm run dev` to inject secrets.
3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
4.  **Run the development server:**
    ```bash
    doppler run -- npm run dev
    # or
    doppler run -- yarn dev
    # or
    doppler run -- pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure Highlights

### `/lib` Directory (Core Modules)

-   `config.public.ts` & `config.server.ts`: Manage public and server-side application configurations, sourcing values from environment variables (via Doppler).
-   `logger.ts`: Handles application-wide logging.
-   `sendgrid.ts`: Manages sending transactional emails (Order Confirmation, Restoration Complete, Share with Family) via SendGrid, using dynamic templates.
-   `stripe.ts`: Contains Stripe client setup (if any direct client usage) and webhook logic is in `app/api/stripe/webhook/route.ts`.
-   `supabaseAdmin.ts`: Initializes the Supabase admin client for server-side operations requiring elevated privileges.
-   `supabase-utils.ts`: Provides utility functions for common Supabase interactions, such as parsing storage URLs (`getSupabaseStoragePathFromUrl`) and downloading files as buffers (`downloadFileAsBuffer`).
-   `utils.ts`: General utility functions (currently includes `cn` for Tailwind CSS class name composition).

### `/app/api` Directory (Backend API Routes)

-   `app/api/share/email/route.ts`: Handles the "Send Photos to Family" feature. Authenticates the user, downloads original and restored images from Supabase, and sends them as email attachments via SendGrid.
-   `app/api/stripe/webhook/route.ts`: Listens for Stripe events (specifically `checkout.session.completed`). Verifies webhook signatures, processes payment success, retrieves original images from Supabase, and triggers the Order Confirmation email via SendGrid with image attachments.
-   `app/api/replicate/predictions/[id]/route.ts`: Manages polling/webhook events from Replicate for image restoration status. On successful restoration, it uploads the restored image to Supabase storage and triggers the Restoration Complete email via SendGrid, attaching both original and restored images.

### Implemented Email Features

All emails are sent using SendGrid and pre-defined templates (IDs managed in Doppler).

1.  **Order Confirmation Email**:
    -   **Trigger**: Successful payment via Stripe (`checkout.session.completed` event).
    -   **Handler**: `app/api/stripe/webhook/route.ts`
    -   **Attachments**: Original uploaded image(s).
    -   **SendGrid Function**: `sendOrderConfirmationEmail` in `lib/sendgrid.ts`.

2.  **Restoration Complete Email**:
    -   **Trigger**: Successful image restoration by Replicate.
    -   **Handler**: `app/api/replicate/predictions/[id]/route.ts`
    -   **Attachments**: Original image(s) and Restored image(s).
    -   **SendGrid Function**: `sendRestorationCompleteEmail` in `lib/sendgrid.ts`.

3.  **Send Photos to Family Email**:
    -   **Trigger**: User action from the frontend.
    -   **Handler**: `app/api/share/email/route.ts`
    -   **Attachments**: Selected original and restored image(s).
    -   **SendGrid Function**: `sendPhotosToFamilyEmail` in `lib/sendgrid.ts`.

## Learn More (Next.js)

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
