"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Plus, Loader2, Lock, Users, Globe } from "lucide-react";

interface CreateBoardDialogProps {
  organizationId: string;
  trigger?: React.ReactNode;
}

const visibilityOptions = [
  {
    value: "private",
    label: "Private",
    description: "Only board members can access",
    icon: Lock,
  },
  {
    value: "organization",
    label: "Organization",
    description: "All organization members can access",
    icon: Users,
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone with the link can access",
    icon: Globe,
  },
];

const backgroundColors = [
  { value: "#0079bf", label: "Blue" },
  { value: "#d29034", label: "Orange" },
  { value: "#519839", label: "Green" },
  { value: "#b04632", label: "Red" },
  { value: "#89609e", label: "Purple" },
  { value: "#cd5a91", label: "Pink" },
  { value: "#4bbf6b", label: "Lime" },
  { value: "#00aecc", label: "Sky" },
  { value: "#838c91", label: "Grey" },
];

export function CreateBoardDialog({
  organizationId,
  trigger,
}: CreateBoardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "organization",
    background: "#0079bf",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Board name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organizationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create board");
      }

      const board = await response.json();
      toast.success("Board created successfully!");
      setOpen(false);
      setFormData({
        name: "",
        description: "",
        visibility: "organization",
        background: "#0079bf",
      });
      router.push(`/dashboard/boards/${board.id}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error creating board:", error);
      toast.error(error.message || "Failed to create board");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new board to organize your tasks and projects.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Board Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Marketing Campaign"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this board about?"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value) =>
                  setFormData({ ...formData, visibility: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-start gap-2">
                          <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Background Color</Label>
              <div className="flex flex-wrap gap-2">
                {backgroundColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-12 h-12 rounded-md transition-all ${
                      formData.background === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() =>
                      setFormData({ ...formData, background: color.value })
                    }
                    disabled={loading}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
