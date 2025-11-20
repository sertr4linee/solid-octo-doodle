import { createAuthClient } from "better-auth/react";
import { magicLinkClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:8081",
  plugins: [
    magicLinkClient(),
    organizationClient({
      // ✅ Activer les teams (boards) côté client
      teams: {
        enabled: true,
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
