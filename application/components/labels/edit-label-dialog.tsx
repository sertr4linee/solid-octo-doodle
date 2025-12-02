"use client";

import { useState } from "react";
import { Label } from "@/lib/types/labels";
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
import { Label as FormLabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "./color-picker";
import { toast } from "sonner";

interface EditLabelDialogProps {
  boardId: string;
  label: Label;
  onLabelUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function EditLabelDialog({
  boardId,
  label,
  onLabelUpdated,
  trigger,
}: EditLabelDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(label.name);
  const [description, setDescription] = useState(label.description || "");
  const [color, setColor] = useState(label.color);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Label name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/boards/${boardId}/labels/${label.id}`, {
        method: "PATCH",
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
        throw new Error(error.error || "Failed to update label");
      }

      toast.success("Label updated successfully");
      setOpen(false);
      onLabelUpdated?.();
    } catch (error) {
      console.error("Error updating label:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update label");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
            <DialogDescription>
              Update the label's name, description, or color.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <FormLabel htmlFor="name">
                Name <span className="text-destructive">*</span>
              </FormLabel>
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
              <FormLabel htmlFor="description">Description</FormLabel>
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
              <FormLabel>Color</FormLabel>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <FormLabel className="text-sm text-muted-foreground mb-2 block">
                Preview
              </FormLabel>
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
              {loading ? "Updating..." : "Update Label"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
