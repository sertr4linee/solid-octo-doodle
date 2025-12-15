import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const GITHUB_CLIENT_ID = process.env.GITHUB_INTEGRATION_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_INTEGRATION_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;

// GET - Handle GitHub OAuth callback
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=missing_params`
      );
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=invalid_state`
      );
    }

    // Verify state is not too old (10 minutes)
    if (Date.now() - stateData.timestamp > 600000) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=expired_state`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=${tokenData.error}`
      );
    }

    // Get GitHub user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubUser = await userResponse.json();

    // Create or update integration
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        type: "github",
        createdBy: stateData.userId,
        organizationId: stateData.organizationId || undefined,
      },
    });

    if (existingIntegration) {
      // Update existing
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          config: JSON.stringify({
            username: githubUser.login,
            userId: githubUser.id,
            avatarUrl: githubUser.avatar_url,
            scope: tokenData.scope,
          }),
          lastUsedAt: new Date(),
        },
      });
    } else {
      // Create new
      await prisma.integration.create({
        data: {
          id: `int_github_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          type: "github",
          name: `GitHub (${githubUser.login})`,
          description: `Connected as ${githubUser.login}`,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          config: JSON.stringify({
            username: githubUser.login,
            userId: githubUser.id,
            avatarUrl: githubUser.avatar_url,
            scope: tokenData.scope,
          }),
          organizationId: stateData.organizationId || null,
          boardId: stateData.boardId || null,
          createdBy: stateData.userId,
          enabled: true,
        },
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?success=github`
    );
  } catch (error) {
    console.error("❌ GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connections?error=callback_failed`
    );
  }
}
