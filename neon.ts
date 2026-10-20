import { defineConfig } from "@neon/config/v1";

const appSecretKeys = [
  "FACEBOOK_APP_ID",
  "FACEBOOK_APP_SECRET",
  "FACEBOOK_GRAPH_API_VERSION",
  "FACEBOOK_OAUTH_REDIRECT_URI",
  "FREEIMAGE_HOST_API_KEY",
  "GEMINI_API_KEY",
  "GNEWS_API_KEY",
  "CRON_SECRET",
  "GOOGLE_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_MAPS_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "VAPID_PRIVATE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_SUBJECT",
  "WEBAUTHN_RP_ID",
  "YOUTUBE_API_KEY",
] as const;

const functionEnv = Object.fromEntries(
  appSecretKeys.flatMap((key) => process.env[key] ? [[key, process.env[key] as string]] : []),
);

export default defineConfig({
  buckets: {
    uploads: { access: "private" },
  },
  functions: {
    api: {
      name: "PuntoNochi API",
      source: "./neon-api.ts",
      env: functionEnv,
    },
  },
});
