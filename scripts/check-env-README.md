# Environment Check Endpoint

This directory contains a secure endpoint to check the environment configuration in your Vercel deployment.

## Usage

1. **Deploy the endpoint**:
   ```bash
   git add app/api/check-env/route.ts
   git commit -m "Add environment check endpoint"
   git push
   ```

2. **Set the secret** (optional but recommended):
   ```bash
   # Generate a secure secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Set it in Vercel
   vercel env add ENV_CHECK_SECRET production
   # Then paste your generated secret
   ```

3. **Test the endpoint**:
   ```bash
   # Replace YOUR_SECRET with your actual secret or 'debug-secret-2025' if not set
   curl "https://restoreclickv4.vercel.app/api/check-env?secret=YOUR_SECRET"
   ```

## Security Notes

- This endpoint should only be used for debugging purposes
- Always use a strong secret in production
- Consider removing this endpoint after debugging
- The endpoint masks sensitive information in the response

## Response Format

The endpoint returns a JSON object with the following structure:

```json
{
  "status": "success",
  "timestamp": "2025-06-21T17:45:30.000Z",
  "environment": {
    "nodeEnv": "production",
    "vercelEnv": "production",
    "vercelRegion": "iad1",
    "nextPublicUrl": "https://restoreclickv4.vercel.app",
    "nextPublicSupabaseUrl": "https://qtgskqusswnsveguehtm.supabase.co",
    "stripeKeyPrefix": "sk_test_51R...",
    "supabaseKeyPrefix": "sb_secret_...",
    "webhookSecretPrefix": "***_abcd"
  },
  "services": {
    "supabase": {
      "connected": true,
      "error": null,
      "orderCount": 72,
      "url": "✓ Set",
      "key": "✓ Set"
    },
    "stripe": {
      "connected": true,
      "error": null,
      "accountId": "acct_1RYSM5Kb3gsRXvgl",
      "key": "✓ Set",
      "webhookSecret": "✓ Set"
    }
  }
}
```

## Troubleshooting

- **403 Forbidden**: Invalid or missing secret
- **500 Error**: Check the error message for details
- **Supabase connection failed**: Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe connection failed**: Verify `STRIPE_SECRET_KEY`
- **Webhook secret not set**: Verify `STRIPE_WEBHOOK_SECRET`
