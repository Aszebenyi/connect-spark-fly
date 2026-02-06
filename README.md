# LeadPulse - AI-Powered Lead Generation SaaS

A production-ready, remix-friendly SaaS template for AI-powered lead generation and outreach.

## 🚀 Quick Start (Remix in 5 Minutes)

### 1. Remix the Project
Click "Remix" in Lovable to create your own copy.

### 2. Configure Platform Settings
Go to `/admin` → **Platform Settings** and update:
- **Branding**: App name, tagline
- **Email**: Sender name, sender email, dashboard URL
- **Stripe**: Your product/price IDs
- **Legal**: Support email, privacy email

### 3. Add API Keys
In Lovable Cloud → **Secrets**, add these keys:

| Secret | Required | Get From |
|--------|----------|----------|
| `STRIPE_SECRET_KEY` | ✅ | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `RESEND_API_KEY` | ✅ | [Resend](https://resend.com/api-keys) |
| `EXA_API_KEY` | ✅ | [Exa AI](https://exa.ai) |
| `APIFY_API_KEY` | ✅ | [Apify Console](https://console.apify.com/account/integrations) |
| `GOOGLE_CLIENT_ID` | Optional | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Optional | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

### 4. Create Stripe Products
Create your subscription products in Stripe, then update the price IDs in Admin → Platform Settings.

### 5. Publish!
Click **Publish** in Lovable to go live.

---

## ✨ Features

- **AI Lead Search** - Natural language search powered by Exa AI
- **LinkedIn Enrichment** - Automatic profile enrichment via Apify
- **Campaign Management** - Organize leads into targeted campaigns
- **Email Outreach** - Gmail integration for personalized outreach
- **Subscription Billing** - Stripe-powered subscriptions with usage limits
- **Admin Dashboard** - User management, analytics, email templates
- **Dynamic Branding** - Change app name/branding from admin panel
- **Google OAuth** - One-click social login

## 🛠 Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Lovable Cloud (Supabase), Edge Functions
- **Payments**: Stripe
- **Email**: Resend + Gmail OAuth
- **AI**: Exa AI, Apify

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth)
├── hooks/          # Custom hooks
├── lib/            # Utilities and configs
├── pages/          # Route pages
└── integrations/   # Supabase client

supabase/
└── functions/      # Edge functions (API endpoints)
```

## 🔐 Security

- Row Level Security (RLS) on all tables
- Leaked password protection (HIBP)
- GDPR-compliant account deletion
- Secure OAuth token storage

## 📄 License

MIT - Feel free to use this template for your own SaaS!
