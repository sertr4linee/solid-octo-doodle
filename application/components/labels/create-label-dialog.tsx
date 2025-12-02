"use client";

import { useState } from "react";
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
import { ColorPicker } from "./color-picker";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface CreateLabelDialogProps {
  boardId: string;
  onLabelCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateLabelDialog({
  boardId,
  onLabelCreated,
  trigger,
}: CreateLabelDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Label name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/boards/${boardId}/labels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create label");
      }

      toast.success("Label created successfully");
      setOpen(false);
      setName("");
      setDescription("");
      setColor("#3b82f6");
      onLabelCreated?.();
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create label");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Label
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Label</DialogTitle>
            <DialogDescription>
              Add a new label to organize and categorize your tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Priority, Bug, Feature"
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this label"
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Preview
              </Label>
              <div
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: color,
                  color: parseInt(color.slice(1), 16) > 0xffffff / 2 ? "#000" : "#fff",
                }}
              >
                {name || "Label Name"}
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Label"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
