"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Plus } from "lucide-react";
import { EmojiPicker } from "@/components/customization/emoji-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
  userReacted: boolean;
}

interface TaskReactionsProps {
  taskId: string;
  boardId: string;
  variant?: "compact" | "full";
  className?: string;
}

export function TaskReactions({ taskId, boardId, variant = "compact", className }: TaskReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { isConnected, on, off } = useSocket({
    boardId,
    enabled: true,
  });

  useEffect(() => {
    loadReactions();
  }, [taskId]);

  useEffect(() => {
    if (!isConnected) return;

    const handleReactionAdded = (data: any) => {
      if (data.taskId === taskId) {
        loadReactions();
      }
    };

    const handleReactionRemoved = (data: any) => {
      if (data.taskId === taskId) {
        loadReactions();
      }
    };

    on("task:reaction:added", handleReactionAdded);
    on("task:reaction:removed", handleReactionRemoved);

    return () => {
      off("task:reaction:added", handleReactionAdded);
      off("task:reaction:removed", handleReactionRemoved);
    };
  }, [isConnected, taskId, on, off]);

  const loadReactions = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/reactions`);
      if (response.ok) {
        const data = await response.json();
        setReactions(data);
      }
    } catch (error) {
      console.error("Error loading reactions:", error);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.removed) {
          toast.info("Reaction removed");
        } else {
          toast.success("Reaction added");
        }
        await loadReactions();
      } else {
        toast.error("Failed to add reaction");
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    } finally {
      setLoading(false);
    }
  };

  if (reactions.length === 0 && variant === "compact") {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {reactions.map((reaction) => (
        <TooltipProvider key={reaction.emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={reaction.userReacted ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs gap-1 transition-all hover:scale-105",
                  reaction.userReacted && "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
                )}
                onClick={() => handleReaction(reaction.emoji)}
                disabled={loading}
              >
                <span className="text-base leading-none">{reaction.emoji}</span>
                <span className="font-semibold">{reaction.count}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="text-xs space-y-1">
                {reaction.users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.image} />
                      <AvatarFallback className="text-[8px]">
                        {user.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </div>
                ))}
                {reaction.users.length > 5 && (
                  <div className="text-muted-foreground">
                    +{reaction.users.length - 5} more
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-100"
            disabled={loading}
          >
            {loading ? (
              <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : variant === "full" ? (
              <Plus className="h-3.5 w-3.5" />
            ) : (
              <Smile className="h-3.5 w-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <EmojiPicker
            onSelect={(emoji) => handleReaction(emoji)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
