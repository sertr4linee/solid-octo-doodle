"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  MessageSquare,
  UserPlus,
  UserMinus,
  Archive,
  Tag,
  CheckSquare,
  Eye,
  Heart,
  ThumbsUp,
  Loader2,
  RefreshCw,
  CheckCheck,
  LayoutGrid,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Activity {
  id: string;
  type: string;
  description: string;
  metadata?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  board?: {
    id: string;
    name: string;
    background?: string;
  };
  task?: {
    id: string;
    title: string;
    emoji?: string;
    listId: string;
  };
}

interface ActivityFeedProps {
  boardId?: string;
  organizationId?: string;
  initialFilter?: "all" | "personal" | "board" | "organization";
  showFilters?: boolean;
  maxHeight?: string;
  compact?: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  board_created: <Plus className="h-4 w-4" />,
  board_updated: <Pencil className="h-4 w-4" />,
  board_deleted: <Trash2 className="h-4 w-4" />,
  board_archived: <Archive className="h-4 w-4" />,
  task_created: <Plus className="h-4 w-4" />,
  task_updated: <Pencil className="h-4 w-4" />,
  task_deleted: <Trash2 className="h-4 w-4" />,
  task_moved: <ArrowRight className="h-4 w-4" />,
  task_archived: <Archive className="h-4 w-4" />,
  comment_added: <MessageSquare className="h-4 w-4" />,
  comment_deleted: <Trash2 className="h-4 w-4" />,
  member_added: <UserPlus className="h-4 w-4" />,
  member_removed: <UserMinus className="h-4 w-4" />,
  label_added: <Tag className="h-4 w-4" />,
  label_removed: <Tag className="h-4 w-4" />,
  checklist_added: <CheckSquare className="h-4 w-4" />,
  checklist_completed: <CheckSquare className="h-4 w-4" />,
  list_created: <Plus className="h-4 w-4" />,
  list_updated: <Pencil className="h-4 w-4" />,
  list_deleted: <Archive className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  board_created: "bg-green-500",
  board_updated: "bg-blue-500",
  board_deleted: "bg-red-500",
  board_archived: "bg-orange-500",
  task_created: "bg-green-500",
  task_updated: "bg-blue-500",
  task_deleted: "bg-red-500",
  task_moved: "bg-purple-500",
  task_archived: "bg-orange-500",
  comment_added: "bg-cyan-500",
  comment_deleted: "bg-red-500",
  member_added: "bg-green-500",
  member_removed: "bg-red-500",
  label_added: "bg-pink-500",
  label_removed: "bg-gray-500",
  checklist_added: "bg-indigo-500",
  checklist_completed: "bg-green-500",
  list_created: "bg-green-500",
  list_updated: "bg-blue-500",
  list_deleted: "bg-red-500",
};

export function ActivityFeed({
  boardId,
  organizationId,
  initialFilter = "all",
  showFilters = true,
  maxHeight = "600px",
  compact = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState(initialFilter);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchActivities = useCallback(
    async (cursor?: string) => {
      try {
        if (cursor) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const params = new URLSearchParams({
          filter,
          limit: "20",
        });

        if (boardId) params.set("boardId", boardId);
        if (organizationId) params.set("organizationId", organizationId);
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/activities?${params}`);
        if (!response.ok) throw new Error("Failed to fetch activities");

        const data = await response.json();

        if (cursor) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities);
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filter, boardId, organizationId]
  );

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && nextCursor) {
          fetchActivities(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, nextCursor, fetchActivities]);

  const handleReaction = (activityId: string, emoji: string) => {
    setReactions((prev) => {
      const current = prev[activityId] || [];
      if (current.includes(emoji)) {
        return { ...prev, [activityId]: current.filter((e) => e !== emoji) };
      }
      return { ...prev, [activityId]: [...current, emoji] };
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          activityIds: activities.map((a) => a.id),
        }),
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const getActivityLink = (activity: Activity) => {
    if (activity.task && activity.board) {
      return `/dashboard/boards/${activity.board.id}?task=${activity.task.id}`;
    }
    if (activity.board) {
      return `/dashboard/boards/${activity.board.id}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {showFilters && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Activity Feed</h2>
            <Badge variant="secondary" className="text-xs">
              {activities.length} items
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="personal">My Activity</SelectItem>
                {boardId && <SelectItem value="board">This Board</SelectItem>}
                {organizationId && <SelectItem value="organization">Organization</SelectItem>}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchActivities()}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-9"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: showFilters ? maxHeight : "100%" }}
      >
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutGrid className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              No activity yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Activity will appear here as you and your team work on boards
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                compact={compact}
                reactions={reactions[activity.id] || []}
                onReaction={(emoji) => handleReaction(activity.id, emoji)}
                link={getActivityLink(activity)}
                isFirst={index === 0}
              />
            ))}
          </div>
        )}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-4">
          {isLoadingMore && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!hasMore && activities.length > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              You've reached the end
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Activity Item
function ActivityItem({
  activity,
  compact,
  reactions,
  onReaction,
  link,
  isFirst,
}: {
  activity: Activity;
  compact: boolean;
  reactions: string[];
  onReaction: (emoji: string) => void;
  link: string | null;
  isFirst: boolean;
}) {
  const iconBgColor = activityColors[activity.type] || "bg-gray-500";
  const icon = activityIcons[activity.type] || <Pencil className="h-4 w-4" />;

  const content = (
    <div
      className={cn(
        "group relative px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
        link && "cursor-pointer"
      )}
    >
      {/* Timeline connector */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />

      <div className="flex gap-4">
        {/* Avatar with icon badge */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10 ring-4 ring-white dark:ring-gray-900">
            <AvatarImage src={activity.user.image} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-medium">
              {activity.user.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-1 -right-1 p-1 rounded-full text-white",
              iconBgColor
            )}
          >
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-semibold">{activity.user.name}</span>{" "}
                <span className="text-gray-600 dark:text-gray-400">
                  {activity.description}
                </span>
              </p>

              {/* Task/Board preview */}
              {!compact && (activity.task || activity.board) && (
                <div className="mt-2 p-3 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
                  {activity.task && (
                    <div className="flex items-center gap-2">
                      {activity.task.emoji && (
                        <span className="text-lg">{activity.task.emoji}</span>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {activity.task.title}
                      </span>
                    </div>
                  )}
                  {activity.board && !activity.task && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: activity.board.background || "#0079bf" }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.board.name}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Reactions */}
          {!compact && (
            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              {["👍", "❤️", "👀"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReaction(emoji);
                  }}
                  className={cn(
                    "px-2 py-1 rounded-full text-sm transition-all hover:scale-110",
                    reactions.includes(emoji)
                      ? "bg-primary/10 ring-2 ring-primary/30"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
