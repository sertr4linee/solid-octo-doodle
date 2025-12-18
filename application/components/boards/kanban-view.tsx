"use client";

import { useState, useEffect } from "react";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
  KanbanColumnTitle,
  KanbanAddCard,
  KanbanDragOverlay,
  type KanbanItem,
  type KanbanColumn,
} from "@/components/kibo-ui/kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Archive, Loader2, Trash2, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { TaskReactions } from "@/components/tasks/task-reactions";
import { TaskTitleWithEmoji } from "@/components/tasks/task-title-with-emoji";
import { ChecklistList } from "@/components/checklists/checklist-list";
import { AssignUserDialog } from "@/components/tasks/assign-user-dialog";
import { AttachmentsSection } from "@/components/attachments";
import { Paperclip } from "lucide-react";
import { CommentList } from "@/components/comments";
import { useSession } from "@/lib/auth-client";

// Simplified label type for display
interface SimpleLabel {
  id: string;
  name: string;
  color: string;
}

interface TaskLabelWithLabel {
  label: SimpleLabel;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  position: number;
  emoji?: string;
  listId?: string; // Optional - will be derived from the parent list
  dueDate?: string;
  assignee?: {
    id: string;
    name: string;
    image?: string;
  };
  taskLabels?: TaskLabelWithLabel[];
  _count: {
    comments: number;
  };
}

interface List {
  id: string;
  name: string;
  position: number;
  color?: string;
  emoji?: string;
  tasks: Task[];
}

interface KanbanViewProps {
  boardId: string;
  lists: List[];
  onTaskMove?: (taskId: string, fromListId: string, toListId: string, newPosition: number) => void;
  onRefresh?: () => void;
}

// Transform tasks to kanban items
interface KanbanTaskItem extends KanbanItem {
  id: string;
  column: string;
  title: string;
  description?: string;
  position: number;
  emoji?: string;
  listId: string;
  dueDate?: string;
  assignee?: Task["assignee"];
  taskLabels?: Task["taskLabels"];
  _count: Task["_count"];
}

export function KanbanView({ boardId, lists, onTaskMove, onRefresh }: KanbanViewProps) {
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addingTaskToList, setAddingTaskToList] = useState<string | null>(null);

  // Transform lists to columns
  const columns: KanbanColumn[] = lists
    .sort((a, b) => a.position - b.position)
    .map((list) => ({
      id: list.id,
      name: list.name,
      color: list.color,
    }));

  // Transform tasks to kanban items
  const items: KanbanTaskItem[] = lists.flatMap((list) =>
    list.tasks.map((task) => ({
      ...task,
      column: list.id,
      listId: list.id,
    }))
  );

  const handleDataChange = async (newItems: KanbanTaskItem[]) => {
    // Find moved items
    for (const item of newItems) {
      const originalTask = lists.flatMap((l) => l.tasks).find((t) => t.id === item.id);
      if (originalTask && originalTask.listId !== item.column) {
        // Task was moved to a different list
        try {
          const response = await fetch(
            `/api/boards/${boardId}/lists/${originalTask.listId}/tasks/${item.id}/move`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                targetListId: item.column,
                position: item.position,
              }),
            }
          );

          if (response.ok) {
            toast.success("Task moved");
            onTaskMove?.(item.id, originalTask.listId || item.column, item.column, item.position);
            onRefresh?.();
          } else {
            toast.error("Failed to move task");
          }
        } catch (error) {
          console.error("Error moving task:", error);
          toast.error("Failed to move task");
        }
      }
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim()) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      });

      if (response.ok) {
        toast.success("List created");
        setNewListName("");
        setIsAddListOpen(false);
        onRefresh?.();
      } else {
        toast.error("Failed to create list");
      }
    } catch (error) {
      toast.error("Failed to create list");
    }
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 h-full p-1">
        <KanbanProvider columns={columns} data={items} onDataChange={handleDataChange}>
          {columns.map((column) => {
            const list = lists.find((l) => l.id === column.id)!;
            const taskCount = list.tasks.length;

            return (
              <KanbanBoard
                key={column.id}
                id={column.id}
                className="bg-white/90 backdrop-blur-sm shadow-xl border-2 border-gray-200"
              >
                <KanbanHeader className="border-b-2 border-gray-200">
                  <KanbanColumnTitle count={taskCount}>
                    {list.emoji && <span className="mr-1">{list.emoji}</span>}
                    {column.name}
                  </KanbanColumnTitle>
                  <ListMenu listId={list.id} listName={list.name} boardId={boardId} onRefresh={onRefresh} />
                </KanbanHeader>

                <KanbanCards<KanbanTaskItem> id={column.id}>
                  {(item) => (
                    <TaskCardItem
                      key={item.id}
                      task={item}
                      boardId={boardId}
                      onRefresh={onRefresh}
                    />
                  )}
                </KanbanCards>

                {addingTaskToList === list.id ? (
                  <AddTaskForm
                    listId={list.id}
                    boardId={boardId}
                    onCancel={() => setAddingTaskToList(null)}
                    onSuccess={() => {
                      setAddingTaskToList(null);
                      onRefresh?.();
                    }}
                  />
                ) : (
                  <KanbanAddCard onClick={() => setAddingTaskToList(list.id)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add a card
                  </KanbanAddCard>
                )}
              </KanbanBoard>
            );
          })}

          <KanbanDragOverlay>
            {(item) => (
              <div className="bg-white rounded-lg p-3 shadow-2xl border-2 border-blue-400 w-72">
                <p className="text-sm font-semibold text-gray-900">
                  {(item as KanbanTaskItem).emoji && (
                    <span className="mr-2">{(item as KanbanTaskItem).emoji}</span>
                  )}
                  {(item as KanbanTaskItem).title}
                </p>
              </div>
            )}
          </KanbanDragOverlay>

          {/* Add List Button */}
          {isAddListOpen ? (
            <div className="shrink-0 w-72 bg-white rounded-xl p-4 shadow-xl border-2 border-gray-200">
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name..."
                className="mb-3 border-2 border-gray-300 focus:border-blue-500 placeholder-gray-400 text-gray-900"
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
                <Button
                  size="sm"
                  onClick={handleAddList}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Add list
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddListOpen(false);
                    setNewListName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 w-72">
              <Button
                variant="ghost"
                className="w-full h-auto min-h-[100px] bg-white/30 hover:bg-white/50 backdrop-blur-md text-white border-2 border-dashed border-white/60 hover:border-white/80 rounded-xl font-bold transition-all hover:scale-105 shadow-lg"
                onClick={() => setIsAddListOpen(true)}
              >
                <Plus className="h-5 w-5 mr-2" />
                Add another list
              </Button>
            </div>
          )}
        </KanbanProvider>
      </div>
    </div>
  );
}

// List Menu Component
function ListMenu({
  listId,
  listName,
  boardId,
  onRefresh,
}: {
  listId: string;
  listName: string;
  boardId: string;
  onRefresh?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteList = async () => {
    if (!confirm(`Are you sure you want to archive "${listName}"?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/lists/${listId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("List archived");
        onRefresh?.();
      } else {
        toast.error("Failed to archive list");
      }
    } catch (error) {
      toast.error("Failed to archive list");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-200">
          <MoreHorizontal className="h-4 w-4 text-gray-700" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white shadow-xl border-2">
        <DropdownMenuItem className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2 text-blue-600" />
          Add card
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">Copy list</DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">Move list</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleDeleteList}
          disabled={isDeleting}
        >
          <Archive className="h-4 w-4 mr-2" />
          {isDeleting ? "Archiving..." : "Archive list"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Add Task Form Component
function AddTaskForm({
  listId,
  boardId,
  onCancel,
  onSuccess,
}: {
  listId: string;
  boardId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/lists/${listId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, emoji }),
      });

      if (response.ok) {
        toast.success("Task created");
        onSuccess();
      } else {
        toast.error("Failed to create task");
      }
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2 bg-white rounded-lg p-3 shadow-md border-2 border-gray-200 mt-2">
      <TaskTitleWithEmoji
        value={title}
        emoji={emoji || undefined}
        onChange={setTitle}
        onEmojiChange={setEmoji}
        placeholder="Enter a title..."
        disabled={isCreating}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isCreating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add card"
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isCreating}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Task Card Item Component
function TaskCardItem({
  task,
  boardId,
  onRefresh,
}: {
  task: KanbanTaskItem;
  boardId: string;
  onRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [boardMembers, setBoardMembers] = useState<{ id: string; name: string; email?: string; image?: string }[]>([]);
  const { data: session } = useSession();

  // Fetch board members when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetch(`/api/boards/${boardId}/members`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setBoardMembers(data.map((m: any) => ({
              id: m.user?.id || m.userId,
              name: m.user?.name || "Unknown",
              email: m.user?.email,
              image: m.user?.image,
            })));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, boardId]);

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
        onRefresh?.();
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
      <KanbanCard
        id={task.id}
        name={task.title}
        column={task.column}
        className="bg-white border-2 border-gray-200 hover:border-blue-400 p-0"
      >
        <div className="p-3 space-y-2" onClick={() => setIsOpen(true)}>
          {/* Labels */}
          {task.taskLabels && task.taskLabels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.taskLabels.slice(0, 4).map((tl) => (
                <SimpleLabelBadge key={tl.label.id} label={tl.label} />
              ))}
              {task.taskLabels.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{task.taskLabels.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Title */}
          <div className="flex items-center gap-2">
            {task.emoji && <span className="text-lg">{task.emoji}</span>}
            <p className="text-sm font-semibold text-gray-900">{task.title}</p>
          </div>

          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}

          {/* Reactions */}
          <TaskReactions taskId={task.id} boardId={boardId} variant="compact" />

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {task.assignee && (
                <Avatar className="h-6 w-6 border-2 border-blue-200">
                  <AvatarImage src={task.assignee.image} />
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {task.assignee.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {task._count.comments > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                💬 {task._count.comments}
              </Badge>
            )}
          </div>
        </div>
      </KanbanCard>

      {/* Task Detail Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              {task.emoji && <span>{task.emoji}</span>}
              {task.title}
            </DialogTitle>
            {task.description && (
              <DialogDescription className="text-base mt-2">
                {task.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Reactions */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Reactions</Label>
              <TaskReactions taskId={task.id} boardId={boardId} variant="full" />
            </div>

            {/* Labels */}
            <div>
              <Label className="text-xs text-muted-foreground">Labels</Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {task.taskLabels && task.taskLabels.length > 0 ? (
                  task.taskLabels.map((tl) => (
                    <SimpleLabelBadge key={tl.label.id} label={tl.label} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No labels</p>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <Label className="text-xs text-muted-foreground">Assigned to</Label>
              {task.assignee ? (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={task.assignee.image} />
                    <AvatarFallback>{task.assignee.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{task.assignee.name}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No one assigned</p>
              )}
            </div>

            {/* Comments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
              </Label>
              {session?.user?.id && (
                <CommentList
                  taskId={task.id}
                  currentUserId={session.user.id}
                  boardMembers={boardMembers}
                />
              )}
            </div>

            {/* Checklists */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Checklists</Label>
              <ChecklistList taskId={task.id} boardId={boardId} />
            </div>

            {/* Attachments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                Attachments
              </Label>
              <AttachmentsSection
                taskId={task.id}
                boardId={boardId}
                listId={task.listId}
                canUpload={true}
                canDelete={true}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-blue-200 hover:bg-blue-50 text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAssignDialogOpen(true);
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Assign
              </Button>
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 border-red-200"
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

      {/* Assign Dialog */}
      <AssignUserDialog
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        taskId={task.id}
        listId={task.listId}
        boardId={boardId}
        currentAssigneeId={task.assignee?.id}
        onSuccess={() => {
          toast.success("Task assignment updated");
          onRefresh?.();
        }}
      />
    </>
  );
}

// Simple Label Badge Component
function SimpleLabelBadge({ label }: { label: SimpleLabel }) {
  // Calculate text color based on background brightness
  const getTextColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? "#000000" : "#ffffff";
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: label.color,
        color: getTextColor(label.color),
      }}
    >
      {label.name}
    </span>
  );
}
