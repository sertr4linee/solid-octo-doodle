"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";

interface ChecklistItemFormProps {
  checklistId: string;
  taskId: string;
  parentId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChecklistItemForm({
  checklistId,
  taskId,
  parentId,
  onSuccess,
  onCancel,
}: ChecklistItemFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/checklists/${checklistId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            parentId,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create item");

      toast.success("Item added");
      setContent("");
      onSuccess?.();
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add an item..."
        disabled={loading}
        autoFocus
      />
      <Button type="submit" size="sm" disabled={loading || !content.trim()}>
        Add
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}
