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
  Tags,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocket } from "@/hooks/use-socket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SocketDebug } from "@/components/socket-debug";
import { LabelManager, LabelBadge, LabelPicker } from "@/components/labels";
import { BackgroundPicker, ThemePicker, EmojiPicker } from "@/components/customization";
import type { BackgroundOption, ThemePreset } from "@/lib/types/customization";

interface Board {
  id: string;
  name: string;
  description?: string;
  background?: string;
  backgroundType?: string;
  backgroundBlur?: boolean;
  theme?: string;
  darkMode?: boolean;
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
      taskLabels?: Array<{
        label: {
          id: string;
          name: string;
          color: string;
        };
      }>;
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
  const [boardDescription, setBoardDescription] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [customizeTab, setCustomizeTab] = useState("background");

  // Obtenir le boardId immédiatement
  useEffect(() => {
    params.then((p) => {
      setBoardId(p.id);
      loadBoard(p.id);
    });
  }, []);

  // Socket.IO connection - se connecte dès que boardId est disponible
  const { isConnected, on, off } = useSocket({
    boardId: boardId || undefined,
    enabled: !!boardId,
  });

  useEffect(() => {
    if (!isConnected || !boardId) return;

    const handleBoardUpdated = (data: any) => {
      console.log("✏️ Board updated:", data);
      setBoard((prev) => (prev ? { ...prev, ...data.data } : null));
      if (data.data.name) setBoardName(data.data.name);
    };

    const handleBoardDeleted = (data: any) => {
      console.log("🗑️ Board deleted:", data);
      toast.info("This board has been deleted");
      router.push("/dashboard/boards");
    };

    const handleListCreated = (data: any) => {
      console.log("📝 List created:", data);
      toast.success("New list created");
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: [...prev.lists, { ...data.data.list, tasks: [] }],
        };
      });
      // Recharger pour avoir les activités à jour
      setTimeout(() => loadBoard(boardId), 500);
    };

    const handleListUpdated = (data: any) => {
      console.log("✏️ List updated:", data);
      setBoard((prev) => {
        if (!prev) return prev;
        const updatedLists = prev.lists.map((list) =>
          list.id === data.data.id ? { ...list, ...data.data } : list
        );
        return { ...prev, lists: updatedLists };
      });
    };

    const handleListDeleted = (data: any) => {
      console.log("🗑️ List deleted:", data);
      toast.info("List deleted");
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lists: prev.lists.filter((list) => list.id !== data.data.listId),
        };
      });
    };

    const handleTaskCreated = (data: any) => {
      console.log("✅ Task created:", data);
      toast.success("Task created by " + (data.userId === boardId ? "you" : "another user"));
      // Mettre à jour l'état local au lieu de recharger
      setBoard((prev) => {
        if (!prev) return prev;
        
        const updatedLists = prev.lists.map((list) => {
          if (list.id === data.data.listId) {
            return {
              ...list,
              tasks: [...list.tasks, data.data.task],
            };
          }
          return list;
        });

        return {
          ...prev,
          lists: updatedLists,
        };
      });
      // Recharger pour avoir les activités à jour
      setTimeout(() => loadBoard(boardId), 500);
    };

    const handleTaskUpdated = (data: any) => {
      console.log("✏️ Task updated:", data);
      setBoard((prev) => {
        if (!prev) return prev;
        const updatedLists = prev.lists.map((list) => ({
          ...list,
          tasks: list.tasks.map((task) =>
            task.id === data.data.id ? { ...task, ...data.data } : task
          ),
        }));
        return { ...prev, lists: updatedLists };
      });
    };

    const handleTaskDeleted = (data: any) => {
      console.log("🗑️ Task deleted:", data);
      toast.info("Task deleted");
      setBoard((prev) => {
        if (!prev) return prev;
        const updatedLists = prev.lists.map((list) => ({
          ...list,
          tasks: list.tasks.filter((task) => task.id !== data.data.taskId),
        }));
        return { ...prev, lists: updatedLists };
      });
    };

    const handleTaskMoved = (data: any) => {
      console.log("🔄 Task moved:", data);
      // Recharger le board pour avoir les positions correctes
      loadBoard(boardId);
    };

    const handleMemberAdded = (data: any) => {
      console.log("👤 Member added:", data);
      toast.success(`${data.data.member.user.name} joined the board`);
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: [...prev.members, data.data.member],
        };
      });
    };

    const handleMemberRemoved = (data: any) => {
      console.log("👋 Member removed:", data);
      toast.info("A member left the board");
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter((m) => m.user.id !== data.data.userId),
        };
      });
    };

    on("board:updated", handleBoardUpdated);
    on("board:deleted", handleBoardDeleted);
    on("board:member-added", handleMemberAdded);
    on("board:member-removed", handleMemberRemoved);
    on("list:created", handleListCreated);
    on("list:updated", handleListUpdated);
    on("list:deleted", handleListDeleted);
    on("task:created", handleTaskCreated);
    on("task:updated", handleTaskUpdated);
    on("task:deleted", handleTaskDeleted);
    on("task:moved", handleTaskMoved);

    return () => {
      off("board:updated", handleBoardUpdated);
      off("board:deleted", handleBoardDeleted);
      off("board:member-added", handleMemberAdded);
      off("board:member-removed", handleMemberRemoved);
      off("list:created", handleListCreated);
      off("list:updated", handleListUpdated);
      off("list:deleted", handleListDeleted);
      off("task:created", handleTaskCreated);
      off("task:updated", handleTaskUpdated);
      off("task:deleted", handleTaskDeleted);
      off("task:moved", handleTaskMoved);
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
        setBoardDescription(data.description || "");
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
        body: JSON.stringify({ 
          name: boardName,
          description: boardDescription 
        }),
      });

      setBoard({ ...board, name: boardName, description: boardDescription });
      setIsSettingsOpen(false);
      toast.success("Board updated successfully");
    } catch (error) {
      toast.error("Failed to update board");
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

  const handleBackgroundChange = async (background: BackgroundOption) => {
    if (!board) return;

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background: background.value,
          backgroundType: background.type,
          backgroundBlur: background.blur,
        }),
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoard(updatedBoard);
        toast.success("Background updated");
      } else {
        toast.error("Failed to update background");
      }
    } catch (error) {
      toast.error("Failed to update background");
    }
  };

  const handleThemeChange = async (theme: ThemePreset) => {
    if (!board) return;

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.id,
          background: theme.background.value,
          backgroundType: theme.background.type,
          backgroundBlur: theme.background.blur,
          darkMode: theme.darkMode,
        }),
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoard(updatedBoard);
        toast.success(`${theme.name} theme applied`);
      } else {
        toast.error("Failed to apply theme");
      }
    } catch (error) {
      toast.error("Failed to apply theme");
    }
  };

  const handleAddList = async () => {
    if (!board || !newListName.trim()) return;

    try {
      const response = await fetch(`/api/boards/${board.id}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      });

      if (response.ok) {
        toast.success("List created");
        setNewListName("");
        setIsAddListOpen(false);
        loadBoard(board.id);
      } else {
        toast.error("Failed to create list");
      }
    } catch (error) {
      toast.error("Failed to create list");
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

  // Determine background style
  const getBackgroundStyle = () => {
    if (!board.background) {
      return { background: "#0079BF" };
    }

    const baseStyle: React.CSSProperties = {};
    
    if (board.backgroundType === "image" || board.backgroundType === "unsplash") {
      baseStyle.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${board.background})`;
      baseStyle.backgroundSize = "cover";
      baseStyle.backgroundPosition = "center";
      baseStyle.backgroundRepeat = "no-repeat";
    } else if (board.backgroundType === "gradient") {
      baseStyle.background = board.background;
    } else {
      baseStyle.backgroundColor = board.background;
    }

    return baseStyle;
  };

  return (
    <div
      className={`h-screen flex flex-col ${board.backgroundBlur ? "backdrop-blur-sm" : ""}`}
      style={getBackgroundStyle()}
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
          {/* Socket.IO Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className="text-xs text-white font-medium">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

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
              <DropdownMenuItem onClick={() => setShowActivity(!showActivity)}>
                <Activity className="h-4 w-4 mr-2" />
                {showActivity ? "Hide" : "Show"} Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsLabelsOpen(true)}>
                <Tags className="h-4 w-4 mr-2" />
                Manage Labels
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCustomizeOpen(true)}>
                <Palette className="h-4 w-4 mr-2" />
                Customize
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
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
      <div className="flex-1 overflow-hidden p-4 flex gap-4">
        {/* Lists Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full">
            {/* Lists */}
            {board.lists
              .sort((a, b) => a.position - b.position)
              .map((list) => (
                <ListColumn key={list.id} list={list} boardId={board.id} />
              ))}

            {/* Add List Button */}
            {isAddListOpen ? (
              <div className="shrink-0 w-72 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list name..."
                  className="mb-3 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddList();
                    if (e.key === "Escape") {
                      setIsAddListOpen(false);
                      setNewListName("");
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAddList} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Add list
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddListOpen(false);
                      setNewListName("");
                    }}
                    className="hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="shrink-0 w-72">
                <Button
                  variant="ghost"
                  className="w-full h-auto min-h-[100px] bg-white/30 hover:bg-white/40 backdrop-blur-sm text-white border-2 border-dashed border-white/50 rounded-xl font-semibold transition-all hover:scale-105"
                  onClick={() => setIsAddListOpen(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add another list
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Sidebar */}
        {showActivity && (
          <div className="w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity
            </h3>
            <div className="space-y-3">
              {board.activities.slice(0, 20).map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={activity.user.image} />
                    <AvatarFallback className="text-xs">
                      {activity.user.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">
                      <span className="font-semibold">{activity.user.name}</span>{" "}
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {board.activities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No activity yet
                </p>
              )}
            </div>
          </div>
        )}
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
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
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

      {/* Labels Management Dialog */}
      <Dialog open={isLabelsOpen} onOpenChange={setIsLabelsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Labels</DialogTitle>
            <DialogDescription>
              Create and organize labels for this board
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <LabelManager boardId={board.id} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Customization Dialog */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Customize Board
            </DialogTitle>
            <DialogDescription>
              Personalize your board with backgrounds, themes, and colors
            </DialogDescription>
          </DialogHeader>
          <Tabs value={customizeTab} onValueChange={setCustomizeTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="background">
                <ImageIcon className="h-4 w-4 mr-2" />
                Background
              </TabsTrigger>
              <TabsTrigger value="theme">
                <Palette className="h-4 w-4 mr-2" />
                Themes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="background" className="overflow-y-auto max-h-[55vh] mt-4">
              <BackgroundPicker
                currentBackground={
                  board.background
                    ? {
                        type: (board.backgroundType as any) || "color",
                        value: board.background,
                        blur: board.backgroundBlur,
                      }
                    : undefined
                }
                onSelect={handleBackgroundChange}
              />
            </TabsContent>
            
            <TabsContent value="theme" className="overflow-y-auto max-h-[55vh] mt-4">
              <ThemePicker
                currentTheme={board.theme}
                onSelect={handleThemeChange}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Socket.IO Debug Panel (dev only) */}
    </div>
  );
}

function ListColumn({ list, boardId }: { list: any; boardId: string }) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/lists/${list.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle }),
      });

      if (response.ok) {
        toast.success("Task created");
        setNewTaskTitle("");
        setIsAddingTask(false);
        // Socket.IO event will update the board automatically
      } else {
        toast.error("Failed to create task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteList = async () => {
    if (!confirm(`Are you sure you want to archive the list "${list.name}"?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/lists/${list.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("List archived");
      } else {
        toast.error("Failed to archive list");
      }
    } catch (error) {
      console.error("Error archiving list:", error);
      toast.error("Failed to archive list");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="shrink-0 w-72 bg-white/90 backdrop-blur-sm rounded-xl p-3 flex flex-col max-h-full shadow-lg border border-gray-200/50">
      {/* List Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">{list.name}</h3>
          <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-gray-200 text-gray-700">
            {list.tasks.length}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100 rounded-md transition-colors">
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Add card</DropdownMenuItem>
            <DropdownMenuItem>Copy list</DropdownMenuItem>
            <DropdownMenuItem>Move list</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={handleDeleteList}
              disabled={isDeleting}
            >
              {isDeleting ? "Archiving..." : "Archive list"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 custom-scrollbar">
        {list.tasks
          .sort((a: any, b: any) => a.position - b.position)
          .map((task: any) => (
            <TaskCard key={task.id} task={task} boardId={boardId} />
          ))}
      </div>

      {/* Add Task */}
      {isAddingTask ? (
        <div className="space-y-2 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
          <Textarea
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter a title for this card..."
            rows={3}
            className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            autoFocus
            disabled={isCreating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
              if (e.key === "Escape" && !isCreating) {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAddTask} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add card"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isCreating}
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

function TaskCard({ task, boardId }: { task: any; boardId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/boards/${boardId}/lists/${task.listId}/tasks/${task.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Task deleted");
        setIsOpen(false);
      } else {
        toast.error("Failed to delete task");
      }
    } catch (error) {
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 bg-white group border-l-4 border-l-transparent hover:border-l-blue-500"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Labels */}
          {task.taskLabels && task.taskLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.taskLabels.slice(0, 4).map((tl: any) => (
                <LabelBadge
                  key={tl.label.id}
                  label={tl.label}
                  size="sm"
                  variant="pill"
                />
              ))}
              {task.taskLabels.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{task.taskLabels.length - 4}
                </Badge>
              )}
            </div>
          )}
          
          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-relaxed">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              {task.assignee && (
                <Avatar className="h-7 w-7 border-2 border-white shadow-md">
                  <AvatarImage src={task.assignee.image} />
                  <AvatarFallback className="text-xs bg-linear-to-br from-blue-500 to-purple-500 text-white font-medium">
                    {task.assignee.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {task._count.comments > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 font-medium">
                💬 {task._count.comments}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Detail Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{task.title}</DialogTitle>
            {task.description && (
              <DialogDescription className="text-base mt-2">
                {task.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Task Details */}
            <div className="space-y-4">
              {/* Labels Section */}
              <div>
                <Label className="text-xs text-muted-foreground">Labels</Label>
                <div className="mt-2">
                  <LabelPicker
                    boardId={boardId}
                    taskId={task.id}
                    selectedLabels={task.taskLabels?.map((tl: any) => tl.label) || []}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Assigned to</Label>
                {task.assignee ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={task.assignee.image} />
                      <AvatarFallback>
                        {task.assignee.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{task.assignee.name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">No one assigned</p>
                )}
              </div>

              {task._count.comments > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Comments</Label>
                  <p className="text-sm mt-1">{task._count.comments} comments</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Assign
              </Button>
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={handleDeleteTask}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
