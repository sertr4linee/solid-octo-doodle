"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Plus,
  Star,
  Archive,
  Users,
  Clock,
  Loader2,
  Grid3x3,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/use-socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InlineLoader } from "@/components/ui/modern-loader";

interface Board {
  id: string;
  name: string;
  description?: string;
  background?: string;
  starred: boolean;
  archived: boolean;
  visibility: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  createdBy: {
    id: string;
    name: string;
    image?: string;
  };
  members: any[];
  _count: {
    lists: number;
    members: number;
  };
  userRole: string;
  updatedAt: string;
}

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  // Form state
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [newBoardOrg, setNewBoardOrg] = useState("");
  const [newBoardVisibility, setNewBoardVisibility] = useState("private");
  const [newBoardBackground, setNewBoardBackground] = useState("#0079BF");

  // Socket.IO connection
  const { isConnected, on, off } = useSocket({ enabled: true });

  useEffect(() => {
    loadBoards();
    loadOrganizations();
  }, [filter]);

  // Écouter les événements Socket.IO
  useEffect(() => {
    if (!isConnected) return;

    const handleBoardCreated = (data: any) => {
      console.log("🆕 New board created:", data);
      toast.success("A new board has been created!");
      loadBoards();
    };

    const handleBoardUpdated = (data: any) => {
      console.log("✏️ Board updated:", data);
      setBoards((prev) =>
        prev.map((board) =>
          board.id === data.data.id ? { ...board, ...data.data } : board
        )
      );
    };

    const handleBoardDeleted = (data: any) => {
      console.log("🗑️ Board deleted:", data);
      toast.info("A board has been deleted");
      setBoards((prev) => prev.filter((board) => board.id !== data.data.id));
    };

    on("board:created", handleBoardCreated);
    on("board:updated", handleBoardUpdated);
    on("board:deleted", handleBoardDeleted);

    return () => {
      off("board:created", handleBoardCreated);
      off("board:updated", handleBoardUpdated);
      off("board:deleted", handleBoardDeleted);
    };
  }, [isConnected, on, off]);

  const loadBoards = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/boards?filter=${filter}`);

      if (response.ok) {
        const data = await response.json();
        setBoards(data || []);
      } else {
        console.error("Failed to load boards");
        toast.error("Failed to load boards");
      }
    } catch (error) {
      console.error("Error loading boards:", error);
      toast.error("Failed to load boards");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data || []);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName || !newBoardOrg) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
          organizationId: newBoardOrg,
          visibility: newBoardVisibility,
          background: newBoardBackground,
        }),
      });

      if (response.ok) {
        const board = await response.json();
        toast.success("Board created successfully! 🎉");
        setNewBoardName("");
        setNewBoardDescription("");
        setNewBoardOrg("");
        setIsCreateDialogOpen(false);
        router.push(`/dashboard/boards/${board.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create board");
      }
    } catch (error: any) {
      console.error("Error creating board:", error);
      toast.error(error.message || "Failed to create board");
    }
  };

  const toggleStar = async (boardId: string, currentStarred: boolean) => {
    try {
      await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: !currentStarred }),
      });

      setBoards((prev) =>
        prev.map((board) =>
          board.id === boardId ? { ...board, starred: !currentStarred } : board
        )
      );
    } catch (error) {
      console.error("Error toggling star:", error);
      toast.error("Failed to update board");
    }
  };

  const backgroundColors = [
    { name: "Blue", value: "#0079BF" },
    { name: "Orange", value: "#D29034" },
    { name: "Green", value: "#519839" },
    { name: "Red", value: "#B04632" },
    { name: "Purple", value: "#89609E" },
    { name: "Pink", value: "#CD5A91" },
    { name: "Lime", value: "#4BBF6B" },
    { name: "Sky", value: "#00AECC" },
    { name: "Grey", value: "#838C91" },
  ];

  const myBoards = boards.filter((b) => !b.archived);
  const starredBoards = myBoards.filter((b) => b.starred);
  const archivedBoards = boards.filter((b) => b.archived);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Boards
          </h1>
          <p className="text-muted-foreground">
            Organize your projects with Kanban boards
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Board
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
              <DialogDescription>
                Create a new board to organize your tasks and collaborate with your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Board Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Project"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this board about?"
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Select value={newBoardOrg} onValueChange={setNewBoardOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={newBoardVisibility}
                  onValueChange={setNewBoardVisibility}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {backgroundColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`h-12 rounded-md transition-all ${
                        newBoardBackground === color.value
                          ? "ring-2 ring-offset-2 ring-primary"
                          : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setNewBoardBackground(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateBoard}>Create Board</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Grid3x3 className="h-4 w-4" />
            All Boards
            <Badge variant="secondary">{myBoards.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            <Users className="h-4 w-4" />
            My Boards
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <Users className="h-4 w-4" />
            Shared with me
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived
            {archivedBoards.length > 0 && (
              <Badge variant="secondary">{archivedBoards.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-6">
          {/* Starred Boards */}
          {starredBoards.length > 0 && filter !== "archived" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                Starred Boards
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {starredBoards.map((board) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    onToggleStar={toggleStar}
                    onClick={() => router.push(`/dashboard/boards/${board.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Boards */}
          <div className="space-y-3">
            {filter !== "archived" && starredBoards.length > 0 && (
              <h2 className="text-lg font-semibold">All Boards</h2>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {boards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onToggleStar={toggleStar}
                  onClick={() => router.push(`/dashboard/boards/${board.id}`)}
                />
              ))}
            </div>
          </div>

          {boards.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No boards yet</p>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  {filter === "archived"
                    ? "No archived boards"
                    : "Create your first board to get started"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BoardCard({
  board,
  onToggleStar,
  onClick,
}: {
  board: Board;
  onToggleStar: (id: string, starred: boolean) => void;
  onClick: () => void;
}) {
  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
      onClick={onClick}
    >
      <div
        className="h-24 relative"
        style={{ backgroundColor: board.background || "#0079BF" }}
      >
        <button
          className="absolute top-2 right-2 p-1.5 rounded bg-black/20 hover:bg-black/40 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(board.id, board.starred);
          }}
        >
          <Star
            className={`h-4 w-4 ${
              board.starred
                ? "fill-yellow-400 text-yellow-400"
                : "text-white"
            }`}
          />
        </button>
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-1">{board.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {board.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{board._count.members} members</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {board.organization.name}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {board.userRole}
          </Badge>
        </div>
        <div className="flex -space-x-2">
          {board.members.slice(0, 5).map((member: any) => (
            <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
              <AvatarImage src={member.user.image} />
              <AvatarFallback className="text-xs">
                {member.user.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
          {board.members.length > 5 && (
            <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
              +{board.members.length - 5}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
