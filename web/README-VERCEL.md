# PRABU Remote Web — Vercel

Deploy this `web` folder as a Next.js project on Vercel.

Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OWNER_USER_ID`
- `INSTALL_KEY`

`INSTALL_KEY` must exactly match `AppConfig.INSTALL_KEY` inside the Android project. It is the bootstrap key that lets a freshly installed APK auto-enroll. After enrollment, each device receives a unique device token. There is no pairing code or device setup screen.

Use HTTPS in production.
