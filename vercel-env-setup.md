# Vercel Environment Variables Setup

## Required Environment Variables for Production Deployment

You need to set these environment variables in your Vercel project dashboard:

### 1. App Configuration
```
NEXT_PUBLIC_APP_URL=https://restoreclickv4-qxn40ynfq-arul-buktechnolos-projects.vercel.app
```

### 2. Stripe Configuration
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_live_price_id
STRIPE_PRICE_ID=price_your_live_price_id
```

### 3. SendGrid Configuration
```
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_WELCOME_TEMPLATE_ID=d-your_welcome_template_id
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=d-your_order_confirmation_template_id
SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID=d-your_restoration_complete_template_id
SENDGRID_FAMILY_SHARE_TEMPLATE_ID=d-your_family_share_template_id
```

### 4. Replicate Configuration
```
REPLICATE_API_TOKEN=r_your_replicate_api_token
```

### 5. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://qtgskqusswnsveguehtm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
```

### 6. Google Tag Manager (Optional)
```
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `restoreclickv4`
3. Go to Settings > Environment Variables
4. Add each variable above with the correct values
5. Make sure to set them for "Production", "Preview", and "Development" environments

## After Setting Environment Variables

1. Trigger a new deployment by running:
   ```bash
   vercel --prod
   ```

2. Or push a new commit to trigger automatic deployment if you have Git integration enabled.

## Important Notes

- Replace all placeholder values with your actual production credentials
- Use live/production keys for Stripe, not test keys
- Make sure your Supabase service role key has the correct permissions
- The NEXT_PUBLIC_APP_URL should match your actual Vercel domain
