"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Film,
  Music,
  File,
  Link2,
  Loader2,
  Trash2,
  Download,
  ExternalLink,
  MoreVertical,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  storageType: "google_drive" | "local" | "external_link";
  url: string;
  thumbnailUrl?: string | null;
  driveFileId?: string | null;
  createdAt: string;
  uploadedBy?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

interface FileUploaderProps {
  taskId: string;
  boardId: string;
  listId: string;
  integrationId?: string;
  onUploadComplete?: (attachment: Attachment) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  className?: string;
}

// Compress image before upload - returns blob and filename
async function compressImage(file: File, maxSizeMB: number = 2): Promise<{ blob: Blob; name: string; type: string }> {
  // Only compress images
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return { blob: file, name: file.name, type: file.type };
  }

  // Skip if already small enough
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return { blob: file, name: file.name, type: file.type };
  }

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new globalThis.Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 2000px on longest side)
      const maxDim = 2000;
      let width = img.width;
      let height = img.height;
      
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Start with quality 0.8 and reduce if needed
      let quality = 0.8;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (blob && (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3)) {
              resolve({ blob, name: file.name, type: "image/jpeg" });
            } else {
              quality -= 0.1;
              tryCompress();
            }
          },
          "image/jpeg",
          quality
        );
      };
      
      tryCompress();
    };
    
    img.onerror = () => resolve({ blob: file, name: file.name, type: file.type });
    img.src = URL.createObjectURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("word")) return FileText;
  return File;
}

export function FileUploader({
  taskId,
  boardId,
  listId,
  integrationId,
  onUploadComplete,
  onUploadError,
  disabled = false,
  maxSizeMB = 25,
  className,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let fileToUpload: Blob = file;
      let fileName = file.name;
      let fileType = file.type;
      
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        // Try to compress images
        if (file.type.startsWith("image/")) {
          toast.info(`Compressing ${file.name}...`);
          const compressed = await compressImage(file, maxSizeMB);
          fileToUpload = compressed.blob;
          fileName = compressed.name;
          fileType = compressed.type;
          
          if (compressed.blob.size > maxSizeMB * 1024 * 1024) {
            toast.error(`${file.name} is too large even after compression (max ${maxSizeMB}MB)`);
            continue;
          }
        } else {
          toast.error(`${file.name} is too large (max ${maxSizeMB}MB)`);
          continue;
        }
      }

      try {
        const formData = new FormData();
        formData.append("file", fileToUpload, fileName);
        formData.append("taskId", taskId);
        formData.append("boardId", boardId);
        if (integrationId) {
          formData.append("integrationId", integrationId);
        }

        const response = await fetch("/api/integrations/google/drive/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        onUploadComplete?.(data.attachment);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        onUploadError?.(message);
        toast.error(message);
      }

      setUploadProgress(((i + 1) / files.length) * 100);
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
      />
      
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">
              Uploading... {Math.round(uploadProgress)}%
            </p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max {maxSizeMB}MB per file. Images will be compressed automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// External Link Dialog
interface AddLinkDialogProps {
  taskId: string;
  boardId: string;
  listId: string;
  onLinkAdded?: (attachment: Attachment) => void;
  trigger?: React.ReactNode;
}

export function AddLinkDialog({
  taskId,
  boardId,
  listId,
  onLinkAdded,
  trigger,
}: AddLinkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !url.trim()) {
      toast.error("Please enter both name and URL");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/boards/${boardId}/lists/${listId}/tasks/${taskId}/attachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, url }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add link");
      }

      onLinkAdded?.(data.attachment);
      toast.success("Link added successfully");
      setOpen(false);
      setName("");
      setUrl("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Link2 className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add External Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Link name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Attachment List Component
interface AttachmentListProps {
  attachments: Attachment[];
  boardId: string;
  listId: string;
  taskId: string;
  onDelete?: (attachmentId: string) => void;
  canDelete?: boolean;
  className?: string;
}

export function AttachmentList({
  attachments,
  boardId,
  listId,
  taskId,
  onDelete,
  canDelete = true,
  className,
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = React.useState<Attachment | null>(null);

  const handleDelete = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    
    setDeletingId(attachmentId);
    
    try {
      const response = await fetch(
        `/api/boards/${boardId}/lists/${listId}/tasks/${taskId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      onDelete?.(attachmentId);
      toast.success("Attachment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const files = attachments.filter((a) => !a.mimeType.startsWith("image/"));

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Images</h4>
          <div className="grid grid-cols-3 gap-2">
            {images.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={attachment.thumbnailUrl || attachment.url}
                  alt={attachment.name}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => setPreviewAttachment(attachment)}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setPreviewAttachment(attachment)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => window.open(attachment.url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Files</h4>
          <div className="space-y-2">
            {files.map((attachment) => {
              const FileIcon = getFileIcon(attachment.mimeType);
              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.size > 0 ? formatFileSize(attachment.size) : "External link"}
                      {attachment.storageType === "google_drive" && " • Google Drive"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(attachment.url, "_blank")}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      {attachment.storageType === "google_drive" && (
                        <DropdownMenuItem 
                          onClick={() => {
                            const downloadUrl = attachment.url.replace("/view", "/uc?export=download");
                            window.open(downloadUrl, "_blank");
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(attachment.id)}
                          className="text-destructive"
                          disabled={deletingId === attachment.id}
                        >
                          {deletingId === attachment.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl p-0">
          {previewAttachment && (
            <div className="relative">
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => window.open(previewAttachment.url, "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setPreviewAttachment(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 bg-card">
                <p className="font-medium">{previewAttachment.name}</p>
                {previewAttachment.uploadedBy && (
                  <p className="text-sm text-muted-foreground">
                    Uploaded by {previewAttachment.uploadedBy.name || previewAttachment.uploadedBy.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Combined Attachments Section for Task Modal
interface AttachmentsSectionProps {
  taskId: string;
  boardId: string;
  listId: string;
  integrationId?: string;
  initialAttachments?: Attachment[];
  canUpload?: boolean;
  canDelete?: boolean;
  className?: string;
}

export function AttachmentsSection({
  taskId,
  boardId,
  listId,
  integrationId,
  initialAttachments = [],
  canUpload = true,
  canDelete = true,
  className,
}: AttachmentsSectionProps) {
  const [attachments, setAttachments] = React.useState<Attachment[]>(initialAttachments);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load attachments if not provided
  React.useEffect(() => {
    if (initialAttachments.length === 0) {
      loadAttachments();
    }
  }, [taskId, boardId, listId]);

  const loadAttachments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/boards/${boardId}/lists/${listId}/tasks/${taskId}/attachments`
      );
      const data = await response.json();
      if (response.ok) {
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error("Failed to load attachments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (attachment: Attachment) => {
    setAttachments((prev) => [attachment, ...prev]);
  };

  const handleDelete = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {canUpload && (
        <div className="flex gap-2">
          <div className="flex-1">
            <FileUploader
              taskId={taskId}
              boardId={boardId}
              listId={listId}
              integrationId={integrationId}
              onUploadComplete={handleUploadComplete}
            />
          </div>
          <AddLinkDialog
            taskId={taskId}
            boardId={boardId}
            listId={listId}
            onLinkAdded={handleUploadComplete}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AttachmentList
          attachments={attachments}
          boardId={boardId}
          listId={listId}
          taskId={taskId}
          onDelete={handleDelete}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
