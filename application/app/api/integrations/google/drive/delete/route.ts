import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_INTEGRATION_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_INTEGRATION_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

// Refresh Google access token if expired
async function refreshGoogleToken(integration: any): Promise<string | null> {
  if (!integration.refreshToken) return integration.accessToken;
  
  if (integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) > new Date(Date.now() + 300000)) {
    return integration.accessToken;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: integration.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    
    if (data.access_token) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: data.access_token,
          tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      });
      return data.access_token;
    }
  } catch (error) {
    console.error("Failed to refresh Google token:", error);
  }
  
  return integration.accessToken;
}

// DELETE /api/integrations/google/drive/delete - Delete file from Google Drive
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Missing attachmentId" },
        { status: 400 }
      );
    }

    // Get attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          include: {
            list: {
              include: {
                board: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
        integration: true,
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Check permissions - only uploader, board owner, or admin can delete
    const board = attachment.task.list.board;
    const membership = board.members.find((m) => m.userId === session.user.id);
    const isUploader = attachment.uploadedById === session.user.id;
    const isOwner = board.createdById === session.user.id;
    const isAdmin = membership?.role === "admin";

    if (!isUploader && !isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to delete this attachment" },
        { status: 403 }
      );
    }

    // Delete from Google Drive if it's a Google Drive attachment
    if (attachment.storageType === "google_drive" && attachment.driveFileId && attachment.integration) {
      const accessToken = await refreshGoogleToken(attachment.integration);
      
      if (accessToken) {
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${attachment.driveFileId}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!response.ok && response.status !== 404) {
            console.warn("Failed to delete from Google Drive:", await response.text());
            // Continue anyway to delete the database record
          }
        } catch (error) {
          console.error("Error deleting from Google Drive:", error);
          // Continue anyway to delete the database record
        }
      }

      // Log the deletion
      await prisma.integrationLog.create({
        data: {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          integrationId: attachment.integration.id,
          action: "file_deleted",
          status: "success",
          message: `Deleted ${attachment.name} from Google Drive`,
          metadata: JSON.stringify({
            attachmentId: attachment.id,
            taskId: attachment.taskId,
            driveFileId: attachment.driveFileId,
            deletedBy: session.user.id,
          }),
        },
      });
    }

    // Delete attachment record
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
