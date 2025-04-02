# NextHaven.ai Web Frontend

## Stripe Integration Setup

To enable the Stripe subscription features, follow these steps:

### 1. Set up your Stripe account

1. Create a Stripe account at [stripe.com](https://stripe.com) if you don't have one
2. Get your API keys from the Stripe Dashboard
3. Create products and pricing plans in the Stripe Dashboard:
   - Basic Plan (price_1R4h3aP294DyvJuy3WMspgq6)
   - Pro Plan (price_1R4hBZP294DyvJuyjqGQ7eqt)

### 2. Set up Supabase Edge Functions

1. Install the Supabase CLI if you haven't already:

   ```
   npm install -g supabase
   ```

2. Log in to Supabase:

   ```
   supabase login
   ```

3. Deploy the Edge Functions:

   ```
   cd web
   supabase functions deploy get-subscription-status
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy create-stripe-customer
   ```

4. Set the required secrets for the functions:
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_test_your_test_key
   supabase secrets set SITE_URL=https://your-site-url.com
   ```

### 3. Set up the customers table

Create the customers table in your Supabase project with the following schema:

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create a unique index on user_id to ensure a user can only have one record
CREATE UNIQUE INDEX customers_user_id_idx ON customers(user_id);

-- Create a unique index on stripe_customer_id to ensure no duplicate customers
CREATE UNIQUE INDEX customers_stripe_customer_id_idx ON customers(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access only their own data
CREATE POLICY customers_user_policy ON customers
  FOR ALL
  USING (auth.uid() = user_id);
```

You can create this table using the Supabase dashboard SQL editor.

### 4. Setting up webhooks to sync subscription status

Stripe webhooks are required to keep the subscription status in sync with your database. Set up the following webhook events in your Stripe Dashboard:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`

Point these to your Supabase Edge Function webhook handler (not included in this implementation).

## Automatic Stripe Customer Creation

The application now automatically creates a Stripe customer for users when they:

1. Sign up for a new account
2. Sign in (if they don't have a customer yet)
3. Access subscription-related features

This ensures every user has a Stripe customer ID, which:

- Prevents errors when checking subscription status
- Enables immediate subscription purchases
- Simplifies the subscription management process

## Troubleshooting

### Subscription Status Not Updating

If you're experiencing issues with subscription status not updating:

1. Check the browser console for error messages
2. Verify the Supabase Edge Functions are deployed correctly
3. Make sure your Stripe API keys are set correctly
4. Check that the customers table exists in your Supabase database
5. Verify that webhook events are being received properly

### Missing Stripe Customer

If users are experiencing errors related to missing Stripe customers:

1. The system should automatically create customers, but if this fails:
2. Have the user log out and log back in (triggers customer creation)
3. Check the Supabase logs for errors in the create-stripe-customer function
4. Verify permissions on the customers table in your database

## Development

### Environment Variables

Required environment variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_publishable_key
VITE_API_URL=your_api_url
```

### Running the App

```
npm install
npm run dev
```
