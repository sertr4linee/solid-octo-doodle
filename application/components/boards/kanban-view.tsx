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
      <div className="flex gap-5 h-full p-2">
        <KanbanProvider columns={columns} data={items} onDataChange={handleDataChange}>
          {columns.map((column) => {
            const list = lists.find((l) => l.id === column.id)!;
            const taskCount = list.tasks.length;

            return (
              <KanbanBoard
                key={column.id}
                id={column.id}
                className="bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-800/50"
              >
                <KanbanHeader className="border-b border-gray-200/50 dark:border-gray-800/50 px-1">
                  <KanbanColumnTitle count={taskCount}>
                    <div className="flex items-center gap-2">
                      {list.emoji && <span className="text-lg">{list.emoji}</span>}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{column.name}</span>
                      <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200/70 dark:bg-gray-700/70 text-gray-600 dark:text-gray-400">
                        {taskCount}
                      </span>
                    </div>
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
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add a card
                  </KanbanAddCard>
                )}
              </KanbanBoard>
            );
          })}

          <KanbanDragOverlay>
            {(item) => (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-2xl border border-primary/30 w-72 ring-2 ring-primary/20">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {(item as KanbanTaskItem).emoji && (
                    <span className="text-lg">{(item as KanbanTaskItem).emoji}</span>
                  )}
                  {(item as KanbanTaskItem).title}
                </p>
              </div>
            )}
          </KanbanDragOverlay>

          {/* Add List Button */}
          {isAddListOpen ? (
            <div className="shrink-0 w-72 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-xl border border-gray-200/50 dark:border-gray-800/50">
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name..."
                className="mb-3 rounded-xl border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary"
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
                  className="rounded-lg font-medium"
                >
                  Add list
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg"
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
                className="w-full h-auto min-h-[100px] bg-white/20 dark:bg-gray-900/20 hover:bg-white/40 dark:hover:bg-gray-900/40 backdrop-blur-xl text-gray-700 dark:text-gray-300 border-2 border-dashed border-gray-300/50 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600 rounded-2xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
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
    <div className="space-y-3 bg-white dark:bg-gray-900 rounded-xl p-4 shadow-lg border border-gray-200/50 dark:border-gray-800/50 mt-2">
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
          className="rounded-lg font-medium"
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
        <Button size="sm" variant="ghost" className="rounded-lg" onClick={onCancel} disabled={isCreating}>
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
        className="group bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200 p-0 overflow-hidden"
      >
        <div className="p-3.5 space-y-3" onClick={() => setIsOpen(true)}>
          {/* Labels */}
          {task.taskLabels && task.taskLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.taskLabels.slice(0, 4).map((tl) => (
                <SimpleLabelBadge key={tl.label.id} label={tl.label} />
              ))}
              {task.taskLabels.length > 4 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md">
                  +{task.taskLabels.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Title */}
          <div className="flex items-start gap-2.5">
            {task.emoji && (
              <span className="text-xl flex-shrink-0 mt-0.5">{task.emoji}</span>
            )}
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-primary transition-colors">
              {task.title}
            </p>
          </div>

          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Reactions */}
          <TaskReactions taskId={task.id} boardId={boardId} variant="compact" />

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                  <AvatarImage src={task.assignee.image} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white font-medium">
                    {task.assignee.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-7 w-7 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {task.dueDate && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              )}
              {task._count.comments > 0 && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {task._count.comments}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </KanbanCard>

      {/* Task Detail Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header with gradient */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-white via-white to-white/95 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                {task.emoji && <span className="text-3xl">{task.emoji}</span>}
                <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                  {task.title}
                </span>
              </DialogTitle>
              {task.description && (
                <DialogDescription className="text-base mt-3 text-gray-600 dark:text-gray-400 leading-relaxed">
                  {task.description}
                </DialogDescription>
              )}
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 space-y-6">
            {/* Quick Info Bar */}
            <div className="flex items-center gap-4 py-4 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl -mx-2">
              {/* Assignee */}
              <div className="flex items-center gap-3">
                {task.assignee ? (
                  <>
                    <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-800 shadow-md">
                      <AvatarImage src={task.assignee.image} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
                        {task.assignee.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned to</p>
                      <p className="text-sm font-semibold">{task.assignee.name}</p>
                    </div>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-10 px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAssignDialogOpen(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                )}
              </div>

              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Labels */}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Labels</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.taskLabels && task.taskLabels.length > 0 ? (
                    task.taskLabels.map((tl) => (
                      <SimpleLabelBadge key={tl.label.id} label={tl.label} />
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No labels</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reactions */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="text-lg">✨</span>
                Reactions
              </Label>
              <TaskReactions taskId={task.id} boardId={boardId} variant="full" />
            </div>

            {/* Comments */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </Label>
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4">
                {session?.user?.id && (
                  <CommentList
                    taskId={task.id}
                    currentUserId={session.user.id}
                    boardMembers={boardMembers}
                  />
                )}
              </div>
            </div>

            {/* Checklists */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Checklists
              </Label>
              <ChecklistList taskId={task.id} boardId={boardId} />
            </div>

            {/* Attachments */}
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
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
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              {task.assignee && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAssignDialogOpen(true);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Reassign
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900"
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
