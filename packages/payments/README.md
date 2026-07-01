# @bushi/payments

Stripe scaffolding, hand-rolled (no `stripe` npm SDK) with typed `fetch` calls to the Stripe REST API.

- `PRICES` (free/starter/pro/enterprise, monthly + annual cents) + `ADD_ONS`; `priceForPlan`.
- `StripeClient`: `createCheckoutSession`, `createBillingPortalSession`, `retrieveSubscription`. Form-encodes bodies to `https://api.stripe.com/v1`.
- `verifyWebhookSignature` (Stripe `t=...,v1=...` HMAC-SHA256 via WebCrypto) + `parseWebhookEvent`.
- `mapSubscriptionStatus` → internal `SubscriptionState`.

**No Cloudflare binding.** Requires secrets: `STRIPE_SECRET_KEY` (`sk_...`) and `STRIPE_WEBHOOK_SECRET` (`whsec_...`), passed as `StripeConfig`.
