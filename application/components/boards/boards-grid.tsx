"use client";

import { useState, useEffect } from "react";
import { BoardCard } from "./board-card";
import { CreateBoardDialog } from "./create-board-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, LayoutGrid, Star, Users, Archive, Plus } from "lucide-react";
import { toast } from "sonner";

interface BoardsGridProps {
  organizationId?: string;
}

export function BoardsGrid({ organizationId }: BoardsGridProps) {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (organizationId) params.append("organizationId", organizationId);
      if (filter !== "all") params.append("filter", filter);

      const response = await fetch(`/api/boards?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch boards");

      const data = await response.json();
      setBoards(data);
    } catch (error) {
      console.error("Error fetching boards:", error);
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, [organizationId, filter]);

  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const starredBoards = filteredBoards.filter((b) => b.starred);
  const regularBoards = filteredBoards.filter((b) => !b.starred);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span>All Boards</span>
                </div>
              </SelectItem>
              <SelectItem value="my">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>My Boards</span>
                </div>
              </SelectItem>
              <SelectItem value="shared">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Shared with me</span>
                </div>
              </SelectItem>
              <SelectItem value="archived">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  <span>Archived</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {organizationId && (
            <CreateBoardDialog organizationId={organizationId} />
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredBoards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="rounded-full bg-muted p-6 mb-4">
            <LayoutGrid className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            {searchQuery
              ? "No boards match your search. Try different keywords."
              : "Create your first board to get started organizing your projects."}
          </p>
          {organizationId && !searchQuery && (
            <CreateBoardDialog
              organizationId={organizationId}
              trigger={
                <Button size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Board
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Starred boards section */}
      {!loading && starredBoards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <h2 className="text-xl font-semibold">Starred Boards</h2>
            <span className="text-sm text-muted-foreground">
              ({starredBoards.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {starredBoards.map((board) => (
              <BoardCard key={board.id} board={board} onUpdate={fetchBoards} />
            ))}
          </div>
        </div>
      )}

      {/* Regular boards section */}
      {!loading && regularBoards.length > 0 && (
        <div className="space-y-4">
          {starredBoards.length > 0 && (
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              <h2 className="text-xl font-semibold">All Boards</h2>
              <span className="text-sm text-muted-foreground">
                ({regularBoards.length})
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {regularBoards.map((board) => (
              <BoardCard key={board.id} board={board} onUpdate={fetchBoards} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
