"use client";

import Link from "next/link";
import { Board } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Lock,
  Users,
  Globe,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Settings,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BoardWithDetails extends Board {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    image?: string | null;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  }>;
  _count: {
    lists: number;
    members: number;
  };
  userRole?: string;
}

interface BoardCardProps {
  board: BoardWithDetails;
  onUpdate?: () => void;
}

const visibilityConfig = {
  private: { icon: Lock, label: "Private", color: "text-slate-500" },
  organization: { icon: Users, label: "Organization", color: "text-blue-500" },
  public: { icon: Globe, label: "Public", color: "text-green-500" },
};

export function BoardCard({ board, onUpdate }: BoardCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const VisibilityIcon =
    visibilityConfig[board.visibility as keyof typeof visibilityConfig]?.icon ||
    Lock;
  const visibilityLabel =
    visibilityConfig[board.visibility as keyof typeof visibilityConfig]
      ?.label || "Private";

  const handleStar = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: !board.starred }),
      });

      if (!response.ok) throw new Error("Failed to update board");

      toast.success(board.starred ? "Removed from starred" : "Added to starred");
      onUpdate?.();
      router.refresh();
    } catch (error) {
      toast.error("Failed to update board");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !board.archived }),
      });

      if (!response.ok) throw new Error("Failed to update board");

      toast.success(board.archived ? "Board restored" : "Board archived");
      onUpdate?.();
      router.refresh();
    } catch (error) {
      toast.error("Failed to update board");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this board?")) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete board");

      toast.success("Board deleted successfully");
      onUpdate?.();
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={`/dashboard/boards/${board.id}`} className="block group">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
        <div
          className="h-24 relative"
          style={{ backgroundColor: board.background || "#0079bf" }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-transparent to-black/20" />
          {board.starred && (
            <Star className="absolute top-2 right-2 h-5 w-5 fill-yellow-400 text-yellow-400" />
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {board.name}
              </h3>
              {board.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {board.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={loading}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleStar}>
                  <Star
                    className={`h-4 w-4 mr-2 ${
                      board.starred ? "fill-yellow-400 text-yellow-400" : ""
                    }`}
                  />
                  {board.starred ? "Remove from starred" : "Add to starred"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/dashboard/boards/${board.id}/settings`);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/dashboard/boards/${board.id}/members`);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="h-4 w-4 mr-2" />
                  {board.archived ? "Restore" : "Archive"}
                </DropdownMenuItem>
                {(board.userRole === "owner" || board.userRole === "admin") && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <VisibilityIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{visibilityLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">{board._count.members} members</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <Badge variant="secondary" className="text-xs">
              {board._count.lists} lists
            </Badge>
            {board.userRole && (
              <Badge
                variant="outline"
                className="text-xs capitalize"
              >
                {board.userRole}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
