# Tolt Affiliate Tracking Integration

This document explains how Tolt affiliate tracking is integrated into the Rentino application.

## Overview

Tolt allows us to track and attribute affiliate referrals to purchases made through our Stripe integration. This integration consists of:

1. A tracking script included on all pages
2. Logic to capture the referral ID and pass it to Stripe
3. Metadata in Stripe to associate purchases with referrals

## Components

### 1. Tracking Script

The Tolt tracking script is included in the `app.html` file in the `<head>` section:

```html
<script async src="https://cdn.tolt.io/tolt.js" data-tolt="pk_73joNrhergyrxqb3xK6BNg59"></script>
```

This script loads on all pages and stores a referral ID in `window.tolt_referral` when a user arrives via an affiliate link.

### 2. ToltTracker Component

We use a `ToltTracker` component that:
- Mounts invisibly in the application layout
- Polls for the referral ID after the script loads
- Stores the ID in a Svelte store for use throughout the app

### 3. Tolt Store

The `toltReferralId` store provides access to the current referral ID from anywhere in the application.

### 4. Stripe Integration

When creating a Stripe Checkout session:
- We retrieve the Tolt referral ID from the store
- Pass it to our API endpoint in the request
- Include it in the `metadata` of the Stripe Checkout session

## Files

- `app.html`: Contains the Tolt tracking script
- `src/lib/components/ToltTracker.svelte`: Captures the referral ID
- `src/lib/stores/tolt.ts`: Manages the referral ID state
- `src/lib/utils/tolt.ts`: Utility functions for accessing Tolt data
- `src/routes/api/stripe/checkout/+server.ts`: Includes referral ID in Stripe metadata
- `src/lib/services/stripe.ts`: Client-side service that passes the referral ID

## How It Works

1. A user clicks an affiliate link and arrives at the site
2. The Tolt script captures the referral ID
3. Our ToltTracker component stores this ID
4. When the user makes a purchase:
   - The client sends the referral ID to our API
   - Our API includes it in the Stripe checkout metadata
   - Tolt can now attribute the purchase to the affiliate

## Testing

To test the integration:
1. Use a Tolt test affiliate link to visit the site
2. Open the browser console and verify that the referral ID is captured
3. Make a test purchase
4. Check the Stripe Dashboard to confirm the metadata includes the referral ID

## Notes

- The referral ID is only captured on the client side
- If a user arrives without an affiliate link, no referral ID will be sent
- Tolt's dashboard will show conversions once purchases are made with referral IDs 