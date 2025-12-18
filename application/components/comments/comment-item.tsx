"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "./markdown-renderer";
import { MarkdownEditor } from "./markdown-editor";
import { ReactionPicker, ReactionDisplay } from "./reaction-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface User {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: User[];
  hasReacted: boolean;
}

interface CommentEditHistory {
  id: string;
  previousContent: string;
  editedAt: string;
  editedBy: User;
}

interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  isResolved?: boolean;
  resolvedAt?: string | null;
  resolvedBy?: User | null;
  isEdited?: boolean;
  user: User;
  reactionGroups?: ReactionGroup[];
  editHistory?: CommentEditHistory[];
  _count?: { replies: number };
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  taskId: string;
  boardMembers: User[];
  onReply?: (parentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onReaction?: (commentId: string, emoji: string) => void;
  onResolve?: (commentId: string, resolved: boolean) => void;
  onViewReplies?: (commentId: string) => void;
  isReply?: boolean;
  isLoading?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  taskId,
  boardMembers,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onResolve,
  onViewReplies,
  isReply = false,
  isLoading = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const isAuthor = comment.userId === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor;
  const hasReplies = (comment._count?.replies ?? 0) > 0;

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment.id, editContent);
    }
    setIsEditing(false);
  }, [comment.id, comment.content, editContent, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(comment.content);
    setIsEditing(false);
  }, [comment.content]);

  const handleDelete = useCallback(() => {
    onDelete?.(comment.id);
    setShowDeleteDialog(false);
  }, [comment.id, onDelete]);

  return (
    <div
      className={cn(
        "group relative",
        isReply && "ml-8 pl-4 border-l-2 border-muted",
        comment.isResolved && "opacity-60"
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.user.image || undefined} alt={comment.user.name} />
          <AvatarFallback className="text-xs">
            {comment.user.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{comment.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.isEdited && (
              <button
                onClick={() => setShowHistoryDialog(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                (edited)
              </button>
            )}
            {comment.isResolved && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Resolved
              </span>
            )}
          </div>

          {/* Body */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Edit your comment..."
                boardMembers={boardMembers}
                minHeight={80}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <MarkdownRenderer content={comment.content} />
            </div>
          )}

          {/* Reactions */}
          <ReactionDisplay
            reactions={comment.reactionGroups || []}
            onToggle={(emoji) => onReaction?.(comment.id, emoji)}
            disabled={isLoading}
          />

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ReactionPicker
                onSelect={(emoji) => onReaction?.(comment.id, emoji)}
                disabled={isLoading}
              />

              {!isReply && onReply && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
                  disabled={isLoading}
                >
                  Reply
                </button>
              )}

              {!isReply && !comment.parentId && onResolve && (
                <button
                  onClick={() => onResolve(comment.id, !comment.isResolved)}
                  className={cn(
                    "p-1.5 rounded-md hover:bg-muted transition-colors text-xs",
                    comment.isResolved
                      ? "text-green-600 hover:text-green-700"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  disabled={isLoading}
                >
                  {comment.isResolved ? "Reopen" : "Resolve"}
                </button>
              )}

              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Replies count */}
          {hasReplies && onViewReplies && (
            <button
              onClick={() => onViewReplies(comment.id)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              {comment._count?.replies} {comment._count?.replies === 1 ? "reply" : "replies"}
            </button>
          )}

          {/* Inline replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  taskId={taskId}
                  boardMembers={boardMembers}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReaction={onReaction}
                  isReply
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit history dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit history</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current version */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Current version</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(comment.updatedAt), { addSuffix: true })}</span>
              </div>
              <MarkdownRenderer content={comment.content} />
            </div>

            {/* Previous versions */}
            {comment.editHistory?.map((edit) => (
              <div key={edit.id} className="border rounded-lg p-4 opacity-75">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <span>Edited by {edit.editedBy.name}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(edit.editedAt), { addSuffix: true })}</span>
                </div>
                <MarkdownRenderer content={edit.previousContent} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
