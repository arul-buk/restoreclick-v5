import { defineConfig } from 'vitest/config';

// Use a dynamic import for vite-tsconfig-paths
export default defineConfig(async () => {
  const tsconfigPaths = (await import('vite-tsconfig-paths')).default;
  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: 'jsdom',
      env: {
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key',
        STRIPE_SECRET_KEY: 'sk_test_mock_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_mock_secret',
        STRIPE_PRICE_ID: 'price_test_mock_id',
        SENDGRID_API_KEY: 'SG.test_mock_key',
        SENDGRID_FROM_EMAIL: 'test@restoreclick.com',
        SENDGRID_WELCOME_TEMPLATE_ID: 'd-test_welcome_template',
        SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID: 'd-test_order_confirmation_template',
        SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID: 'd-test_restoration_complete_template',
        SENDGRID_FAMILY_SHARE_TEMPLATE_ID: 'd-test_family_share_template',
        REPLICATE_API_TOKEN: 'r_test_mock_token'
      },
      // If you have a tsconfig.test.json or similar, you might need to specify it:
      // tsconfig: './tsconfig.test.json'
    },
  };
});
