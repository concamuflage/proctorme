This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run both servers together:

```bash
npm run dev:full
```

Or run them separately:

Frontend (Next.js):

```bash
npm run dev
```

Backend (Node.js):

```bash
cd backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Email Verification

Email verification is handled by the backend and sent through Resend.

Required backend env vars:

```bash
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=onboarding@your-domain.com
CLIENT_ORIGIN=http://localhost:3000
```

Optional backend env vars:

```bash
EMAIL_VERIFICATION_APP_URL=http://localhost:3000
EMAIL_VERIFICATION_TTL_HOURS=24
```

Notes:

- `CLIENT_ORIGIN` is already used for CORS and is also the default base URL for verification links.
- `EMAIL_VERIFICATION_APP_URL` overrides the link target if you want emails to point somewhere else.
- New signups must verify their email before they can log in.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Notes for this project(Only visible to myself, the developer)

https://docs.google.com/document/d/1DHpEzztZBd8EhRBhO4K2jrpKekXwEouzXqEK2Xs3XGY/edit?tab=t.0