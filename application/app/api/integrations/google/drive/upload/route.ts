import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_INTEGRATION_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_INTEGRATION_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

// Refresh Google access token if expired
async function refreshGoogleToken(integration: any): Promise<string | null> {
  if (!integration.refreshToken) return integration.accessToken;
  
  // Check if token is expired (with 5 min buffer)
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
      // Update integration with new token
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

// Create or get the app folder in Google Drive
async function getOrCreateAppFolder(accessToken: string, boardName: string): Promise<string> {
  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='TaskBoard Attachments' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  
  const searchData = await searchResponse.json();
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not exists
  const createResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "TaskBoard Attachments",
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  );

  const folder = await createResponse.json();
  return folder.id;
}

// POST /api/integrations/google/drive/upload - Upload file to Google Drive
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const taskId = formData.get("taskId") as string;
    const boardId = formData.get("boardId") as string;
    const integrationId = formData.get("integrationId") as string;

    if (!file || !taskId || !boardId) {
      return NextResponse.json(
        { error: "Missing required fields: file, taskId, boardId" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25MB" },
        { status: 400 }
      );
    }

    // Get Google Drive integration
    let integration;
    if (integrationId) {
      integration = await prisma.integration.findFirst({
        where: {
          id: integrationId,
          type: "google_drive",
          enabled: true,
        },
      });
    } else {
      // Find any available Google Drive integration for this user
      integration = await prisma.integration.findFirst({
        where: {
          type: "google_drive",
          createdBy: session.user.id,
          enabled: true,
        },
      });
    }

    if (!integration) {
      return NextResponse.json(
        { error: "Google Drive not connected. Please connect Google Drive first." },
        { status: 400 }
      );
    }

    // Verify user has access to the task
    const task = await prisma.task.findFirst({
      where: { id: taskId },
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
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isMember = task.list.board.members.some(
      (m) => m.userId === session.user.id
    );
    if (!isMember && task.list.board.createdById !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Refresh token if needed
    const accessToken = await refreshGoogleToken(integration);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to authenticate with Google Drive" },
        { status: 401 }
      );
    }

    // Get or create app folder
    const folderId = await getOrCreateAppFolder(accessToken, task.list.board.name);

    // Upload file to Google Drive using resumable upload
    const fileBuffer = await file.arrayBuffer();
    
    // First, initiate resumable upload
    const initResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": file.type,
          "X-Upload-Content-Length": file.size.toString(),
        },
        body: JSON.stringify({
          name: file.name,
          parents: [folderId],
          mimeType: file.type,
        }),
      }
    );

    const uploadUrl = initResponse.headers.get("Location");
    
    if (!uploadUrl) {
      console.error("Failed to get upload URL:", await initResponse.text());
      return NextResponse.json(
        { error: "Failed to initiate upload to Google Drive" },
        { status: 500 }
      );
    }

    // Upload the file content
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": file.size.toString(),
        "Content-Type": file.type,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error("Upload failed:", error);
      return NextResponse.json(
        { error: "Failed to upload file to Google Drive" },
        { status: 500 }
      );
    }

    const driveFile = await uploadResponse.json();

    // Make file accessible via link
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );

    // Get file details with thumbnail
    const fileDetailsResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFile.id}?fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const fileDetails = await fileDetailsResponse.json();

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        taskId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        storageType: "google_drive",
        storageId: driveFile.id,
        url: fileDetails.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
        thumbnailUrl: fileDetails.thumbnailLink?.replace("=s220", "=s400") || null,
        driveFileId: driveFile.id,
        driveFolderId: folderId,
        integrationId: integration.id,
        uploadedById: session.user.id,
      },
    });

    // Update integration last used
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastUsedAt: new Date() },
    });

    // Log the upload
    await prisma.integrationLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        integrationId: integration.id,
        action: "file_uploaded",
        status: "success",
        message: `Uploaded ${file.name} to Google Drive`,
        metadata: JSON.stringify({
          attachmentId: attachment.id,
          taskId,
          fileSize: file.size,
          mimeType: file.type,
          driveFileId: driveFile.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: attachment.url,
        thumbnailUrl: attachment.thumbnailUrl,
        createdAt: attachment.createdAt,
      },
    });
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
