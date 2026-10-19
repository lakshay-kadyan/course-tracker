import type { NextConfig } from "next";

// Accepts the variable names Supabase shows in its "Connect" panel (VITE_*), the Next.js names (NEXT_PUBLIC_*),
// and the newer "publishable key" name. Only the public URL and publishable/anon key are exposed to the browser.
const env = process.env;
const supabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
};

const nextConfig: NextConfig = {
  env: supabaseEnv,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
