"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  MoreHorizontal,
  Users,
  Settings,
  Archive,
  Trash2,
  Plus,
  Loader2,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocket } from "@/hooks/use-socket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  }>;
  lists: Array<{
    id: string;
    name: string;
    position: number;
    tasks: Array<{
      id: string;
      title: string;
      description?: string;
      position: number;
      assignee?: {
        id: string;
        name: string;
        image?: string;
      };
      _count: {
        comments: number;
      };
    }>;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  userRole: string;
}

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string>("");
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardName, setBoardName] = useState("");

  // Socket.IO connection
  const { isConnected, on, off } = useSocket({
    boardId: boardId,
    enabled: !!boardId,
  });

  useEffect(() => {
    params.then((p) => {
      setBoardId(p.id);
      loadBoard(p.id);
    });
  }, []);

  useEffect(() => {
    if (!isConnected || !boardId) return;

    const handleBoardUpdated = (data: any) => {
      console.log("✏️ Board updated:", data);
      setBoard((prev) => (prev ? { ...prev, ...data.data } : null));
    };

    const handleBoardDeleted = (data: any) => {
      console.log("🗑️ Board deleted:", data);
      toast.info("This board has been deleted");
      router.push("/dashboard/boards");
    };

    on("board:updated", handleBoardUpdated);
    on("board:deleted", handleBoardDeleted);

    return () => {
      off("board:updated", handleBoardUpdated);
      off("board:deleted", handleBoardDeleted);
    };
  }, [isConnected, boardId, on, off, router]);

  const loadBoard = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/boards/${id}`);

      if (response.ok) {
        const data = await response.json();
        setBoard(data);
        setBoardName(data.name);
      } else {
        toast.error("Failed to load board");
        router.push("/dashboard/boards");
      }
    } catch (error) {
      console.error("Error loading board:", error);
      toast.error("Failed to load board");
      router.push("/dashboard/boards");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStar = async () => {
    if (!board) return;

    try {
      await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: !board.starred }),
      });

      setBoard({ ...board, starred: !board.starred });
      toast.success(board.starred ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      toast.error("Failed to update board");
    }
  };

  const handleUpdateBoardName = async () => {
    if (!board || !boardName.trim()) return;

    try {
      await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName }),
      });

      setBoard({ ...board, name: boardName });
      setEditingBoardName(false);
      toast.success("Board name updated");
    } catch (error) {
      toast.error("Failed to update board name");
    }
  };

  const handleArchiveBoard = async () => {
    if (!board) return;

    try {
      await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });

      toast.success("Board archived");
      router.push("/dashboard/boards");
    } catch (error) {
      toast.error("Failed to archive board");
    }
  };

  const handleDeleteBoard = async () => {
    if (!board) return;

    if (!confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      return;
    }

    try {
      await fetch(`/api/boards/${board.id}`, {
        method: "DELETE",
      });

      toast.success("Board deleted");
      router.push("/dashboard/boards");
    } catch (error) {
      toast.error("Failed to delete board");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return null;
  }

  return (
    <div
      className="h-screen flex flex-col"
      style={{
        background: board.background
          ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), ${board.background}`
          : "#0079BF",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/boards")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {editingBoardName ? (
            <div className="flex items-center gap-2">
              <Input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onBlur={handleUpdateBoardName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateBoardName();
                  if (e.key === "Escape") {
                    setBoardName(board.name);
                    setEditingBoardName(false);
                  }
                }}
                className="bg-white/90 text-gray-900 font-semibold text-lg w-64"
                autoFocus
              />
            </div>
          ) : (
            <h1
              className="text-2xl font-bold text-white cursor-pointer hover:bg-white/10 px-3 py-1 rounded"
              onClick={() => setEditingBoardName(true)}
            >
              {board.name}
            </h1>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStar}
            className="text-white hover:bg-white/20"
          >
            <Star
              className={`h-5 w-5 ${
                board.starred ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
          </Button>

          <Badge variant="secondary" className="bg-white/90">
            {board.visibility}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Members Avatars */}
          <div className="flex -space-x-2">
            {board.members.slice(0, 5).map((member) => (
              <Avatar
                key={member.id}
                className="h-8 w-8 border-2 border-white"
                title={member.user.name}
              >
                <AvatarImage src={member.user.image} />
                <AvatarFallback className="text-xs">
                  {member.user.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {board.members.length > 5 && (
              <div className="h-8 w-8 rounded-full border-2 border-white bg-white/90 flex items-center justify-center text-xs font-semibold">
                +{board.members.length - 5}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-white bg-white/10 hover:bg-white/20"
          >
            <Users className="h-4 w-4 mr-2" />
            Invite
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchiveBoard}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Board
              </DropdownMenuItem>
              {board.userRole === "owner" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteBoard}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Board
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full">
          {/* Lists */}
          {board.lists
            .sort((a, b) => a.position - b.position)
            .map((list) => (
              <ListColumn key={list.id} list={list} boardId={board.id} />
            ))}

          {/* Add List Button */}
          <div className="flex-shrink-0 w-72">
            <Button
              variant="ghost"
              className="w-full h-auto min-h-[100px] bg-white/20 hover:bg-white/30 text-white border-2 border-dashed border-white/40"
              onClick={() => setIsAddListOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add another list
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Board Settings</DialogTitle>
            <DialogDescription>
              Configure your board settings and preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Board Name</Label>
              <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={board.description || ""}
                placeholder="What is this board about?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateBoardName}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListColumn({ list, boardId }: { list: any; boardId: string }) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    // TODO: Implement task creation API
    toast.success("Task created (API not yet implemented)");
    setNewTaskTitle("");
    setIsAddingTask(false);
  };

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 rounded-lg p-3 flex flex-col max-h-full">
      {/* List Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{list.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Add card</DropdownMenuItem>
            <DropdownMenuItem>Copy list</DropdownMenuItem>
            <DropdownMenuItem>Move list</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              Archive list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {list.tasks
          .sort((a: any, b: any) => a.position - b.position)
          .map((task: any) => (
            <TaskCard key={task.id} task={task} />
          ))}
      </div>

      {/* Add Task */}
      {isAddingTask ? (
        <div className="space-y-2">
          <Textarea
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter a title for this card..."
            rows={3}
            className="resize-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
              if (e.key === "Escape") {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAddTask}>
              Add card
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="justify-start text-gray-600 hover:bg-gray-200"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add a card
        </Button>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow bg-white">
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium text-gray-900">{task.title}</p>
        {task.description && (
          <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between">
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.image} />
              <AvatarFallback className="text-xs">
                {task.assignee.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          )}
          {task._count.comments > 0 && (
            <Badge variant="secondary" className="text-xs">
              💬 {task._count.comments}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
