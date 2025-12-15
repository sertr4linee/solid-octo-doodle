import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Verify API key and return user/org info
export async function verifyApiKey(request: NextRequest): Promise<{
  valid: boolean;
  apiKey?: {
    id: string;
    userId: string;
    organizationId: string | null;
    scopes: string[];
    rateLimit: number;
  };
  error?: string;
}> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Hash the provided token
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Find API key by hash
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      key: tokenHash,
      enabled: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid or expired API key" };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  // Parse scopes from JSON string
  const scopes = JSON.parse(apiKey.scopes) as string[];

  return {
    valid: true,
    apiKey: {
      id: apiKey.id,
      userId: apiKey.userId,
      organizationId: apiKey.organizationId,
      scopes,
      rateLimit: apiKey.rateLimit,
    },
  };
}

// Check if API key has required scope
export function hasScope(scopes: string[], required: string | string[]): boolean {
  const requiredScopes = Array.isArray(required) ? required : [required];
  
  // Check for wildcard scope
  if (scopes.includes("*")) {
    return true;
  }

  // Check each required scope
  return requiredScopes.every((req) => {
    // Direct match
    if (scopes.includes(req)) {
      return true;
    }

    // Check for partial wildcard (e.g., "read:*" matches "read:boards")
    const [action, resource] = req.split(":");
    const wildcardScope = `${action}:*`;
    if (scopes.includes(wildcardScope)) {
      return true;
    }

    // Check for resource wildcard (e.g., "*:boards" matches "read:boards")
    const resourceWildcard = `*:${resource}`;
    if (scopes.includes(resourceWildcard)) {
      return true;
    }

    return false;
  });
}

// Middleware helper for API routes
export async function withApiKey(
  request: NextRequest,
  requiredScopes: string[],
  handler: (
    request: NextRequest,
    apiKey: {
      id: string;
      userId: string;
      organizationId: string | null;
      scopes: string[];
    }
  ) => Promise<NextResponse>
): Promise<NextResponse> {
  const { valid, apiKey, error } = await verifyApiKey(request);

  if (!valid || !apiKey) {
    return NextResponse.json(
      { error: error || "Unauthorized" },
      { status: 401 }
    );
  }

  // Check scopes
  if (!hasScope(apiKey.scopes, requiredScopes)) {
    return NextResponse.json(
      {
        error: "Insufficient permissions",
        required: requiredScopes,
        available: apiKey.scopes,
      },
      { status: 403 }
    );
  }

  return handler(request, apiKey);
}

// Rate limiting helper (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  apiKeyId: string,
  limit: number,
  windowMs = 60000 // 1 minute default
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(apiKeyId);

  if (!record || record.resetAt <= now) {
    // Start new window
    const resetAt = now + windowMs;
    rateLimitStore.set(apiKeyId, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
