"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "./markdown-editor";
import { CommentItem } from "./comment-item";
import { toast } from "sonner";

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
  _count?: { replies: number };
  replies?: Comment[];
}

interface CommentListProps {
  taskId: string;
  currentUserId: string;
  boardMembers: User[];
  className?: string;
}

export function CommentList({
  taskId,
  currentUserId,
  boardMembers,
  className,
}: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === "resolved") params.set("resolved", "true");
      if (filter === "unresolved") params.set("resolved", "false");

      const response = await fetch(`/api/tasks/${taskId}/comments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch comments");

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [taskId, filter]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Extract mentions from content
  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]); // User ID is in the parentheses
    }
    return mentions;
  };

  // Create comment
  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const mentionedUserIds = extractMentions(newComment);
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          mentionedUserIds,
        }),
      });

      if (!response.ok) throw new Error("Failed to create comment");

      const data = await response.json();
      setComments((prev) => [...prev, { ...data.comment, reactionGroups: [], _count: { replies: 0 } }]);
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reply to comment
  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const mentionedUserIds = extractMentions(replyContent);
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          parentId,
          mentionedUserIds,
        }),
      });

      if (!response.ok) throw new Error("Failed to reply");

      // Refresh comments to get updated reply count
      await fetchComments();
      setReplyingTo(null);
      setReplyContent("");
      toast.success("Reply added");
    } catch (error) {
      console.error("Error replying:", error);
      toast.error("Failed to add reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit comment
  const handleEdit = async (commentId: string, content: string) => {
    setIsSubmitting(true);
    try {
      const mentionedUserIds = extractMentions(content);
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mentionedUserIds }),
      });

      if (!response.ok) throw new Error("Failed to update comment");

      const data = await response.json();
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...data.comment } : c))
      );
      toast.success("Comment updated");
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      const data = await response.json();
      if (data.softDeleted) {
        // Comment was soft-deleted (has replies)
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, content: "[This comment has been deleted]", isEdited: true }
              : c
          )
        );
      } else {
        // Comment was fully deleted
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle reaction
  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) throw new Error("Failed to toggle reaction");

      const data = await response.json();
      
      // Update local state
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id !== commentId) return comment;

          const currentReactions = comment.reactionGroups || [];
          const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

          if (data.action === "removed") {
            if (existingIdx >= 0) {
              const reaction = currentReactions[existingIdx];
              if (reaction.count === 1) {
                return {
                  ...comment,
                  reactionGroups: currentReactions.filter((_, i) => i !== existingIdx),
                };
              }
              return {
                ...comment,
                reactionGroups: currentReactions.map((r, i) =>
                  i === existingIdx
                    ? { ...r, count: r.count - 1, hasReacted: false }
                    : r
                ),
              };
            }
          } else {
            if (existingIdx >= 0) {
              return {
                ...comment,
                reactionGroups: currentReactions.map((r, i) =>
                  i === existingIdx
                    ? { ...r, count: r.count + 1, hasReacted: true }
                    : r
                ),
              };
            }
            return {
              ...comment,
              reactionGroups: [
                ...currentReactions,
                {
                  emoji,
                  count: 1,
                  users: [{ id: currentUserId, name: "You", image: undefined }],
                  hasReacted: true,
                },
              ],
            };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast.error("Failed to react");
    }
  };

  // Resolve thread
  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });

      if (!response.ok) throw new Error("Failed to resolve thread");

      const data = await response.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                isResolved: data.isResolved,
                resolvedAt: data.resolvedAt,
                resolvedBy: data.resolvedBy,
              }
            : c
        )
      );
      toast.success(resolved ? "Thread resolved" : "Thread reopened");
    } catch (error) {
      console.error("Error resolving thread:", error);
      toast.error("Failed to update thread");
    }
  };

  // View thread replies
  const handleViewReplies = async (commentId: string) => {
    if (expandedThreads.has(commentId)) {
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments?parentId=${commentId}`);
      if (!response.ok) throw new Error("Failed to fetch replies");

      const data = await response.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: data.comments } : c
        )
      );
      setExpandedThreads((prev) => new Set(prev).add(commentId));
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast.error("Failed to load replies");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Comments</h3>
        <div className="flex gap-1">
          {(["all", "unresolved", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2 py-1 text-xs rounded-md transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Comment composer */}
      <div className="space-y-2">
        <MarkdownEditor
          value={newComment}
          onChange={setNewComment}
          placeholder="Write a comment... Use @ to mention someone"
          boardMembers={boardMembers}
          minHeight={80}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                taskId={taskId}
                boardMembers={boardMembers}
                onReply={(parentId) => setReplyingTo(parentId)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onResolve={handleResolve}
                onViewReplies={handleViewReplies}
                isLoading={isSubmitting}
              />

              {/* Reply composer */}
              {replyingTo === comment.id && (
                <div className="ml-11 mt-3 space-y-2">
                  <MarkdownEditor
                    value={replyContent}
                    onChange={setReplyContent}
                    placeholder={`Reply to ${comment.user.name}...`}
                    boardMembers={boardMembers}
                    minHeight={60}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyContent.trim() || isSubmitting}
                    >
                      Reply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
