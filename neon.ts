import { defineConfig } from "@neon/config/v1";

// Lakebase Postgres only. Sign-in is handled by Azure AD B2C, so Neon Auth stays off.
// Add `buckets` back here if profile photo uploads are introduced.
export default defineConfig({
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
