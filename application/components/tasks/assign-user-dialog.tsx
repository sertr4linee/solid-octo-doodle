"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BoardMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface AssignUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  boardId: string;
  currentAssigneeId?: string;
  onSuccess?: () => void;
}

export function AssignUserDialog({
  open,
  onOpenChange,
  taskId,
  boardId,
  currentAssigneeId,
  onSuccess,
}: AssignUserDialogProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    currentAssigneeId
  );

  useEffect(() => {
    if (open) {
      loadMembers();
      setSelectedUserId(currentAssigneeId);
    }
  }, [open, boardId, currentAssigneeId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${boardId}/members`);
      if (!response.ok) throw new Error("Failed to load members");

      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("Failed to load board members");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (userId: string | null) => {
    try {
      setAssigning(true);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId: userId,
        }),
      });

      if (!response.ok) throw new Error("Failed to assign user");

      toast.success(userId ? "User assigned successfully" : "User unassigned");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning user:", error);
      toast.error("Failed to assign user");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Task</DialogTitle>
          <DialogDescription>
            Select a board member to assign this task to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Unassign option */}
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-auto py-3",
                  !selectedUserId && "bg-accent"
                )}
                onClick={() => {
                  setSelectedUserId(undefined);
                  handleAssign(null);
                }}
                disabled={assigning}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Unassigned</div>
                    <div className="text-xs text-muted-foreground">
                      Remove assignee
                    </div>
                  </div>
                  {!selectedUserId && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </Button>

              {/* Member list */}
              {members.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-3",
                    selectedUserId === member.user.id && "bg-accent"
                  )}
                  onClick={() => {
                    setSelectedUserId(member.user.id);
                    handleAssign(member.user.id);
                  }}
                  disabled={assigning}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user.image} />
                      <AvatarFallback>
                        {member.user.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.user.email}
                      </div>
                    </div>
                    {selectedUserId === member.user.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </Button>
              ))}

              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No board members found</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
