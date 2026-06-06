# Page URLs

This file tracks the page routes currently exposed by the Next.js app.

To refresh this list, search for page files:

```bash
find app -name page.tsx -o -name page.ts -o -name page.jsx -o -name page.js
```

## Routes

- `/`
- `/about`
- `/contact`
- `/proctors`
- `/proctors/[proctorId]`
- `/signup`
- `/login`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/verify-school-email`
- `/verify-organization-email`
- `/cart`
- `/checkout/success`
- `/profile`
- `/profile/orders`
- `/account/post-login`
- `/account/role-choice`
- `/account/proctor-verification`
- `/account/corporate-verification`
- `/admin`
- `/admin/proctor-applications`
- `/admin/profile-change-requests`
- `/admin/organization-applications`
- `/policies/shipping`
- `/policies/returns`

## Dynamic Routes

- `/proctors/[proctorId]`: replace `[proctorId]` with the proctor slug/id used by the app.
