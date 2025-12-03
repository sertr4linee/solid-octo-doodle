"use client";

import { useState, useEffect } from "react";
import { Label, LabelWithStats, LABEL_TEMPLATES } from "@/lib/types/labels";
import { LabelBadge } from "./label-badge";
import { CreateLabelDialog } from "./create-label-dialog";
import { EditLabelDialog } from "./edit-label-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Edit, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

interface LabelManagerProps {
  boardId: string;
}

export function LabelManager({ boardId }: LabelManagerProps) {
  const [labels, setLabels] = useState<LabelWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    label: Label | null;
  }>({ open: false, label: null });

  useEffect(() => {
    loadLabels();
  }, [boardId]);

  const loadLabels = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/labels?includeStats=true`);
      if (!response.ok) throw new Error("Failed to load labels");
      const data = await response.json();
      setLabels(data);
    } catch (error) {
      console.error("Error loading labels:", error);
      toast.error("Failed to load labels");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.label) return;

    try {
      const response = await fetch(
        `/api/boards/${boardId}/labels/${deleteDialog.label.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete label");

      toast.success("Label deleted successfully");
      setDeleteDialog({ open: false, label: null });
      loadLabels();
    } catch (error) {
      console.error("Error deleting label:", error);
      toast.error("Failed to delete label");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/labels/export`);
      if (!response.ok) throw new Error("Failed to export labels");

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `labels-${boardId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Labels exported successfully");
    } catch (error) {
      console.error("Error exporting labels:", error);
      toast.error("Failed to export labels");
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.labels || !Array.isArray(data.labels)) {
        throw new Error("Invalid file format");
      }

      const response = await fetch(`/api/boards/${boardId}/labels/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: data.labels, mode: "merge" }),
      });

      if (!response.ok) throw new Error("Failed to import labels");

      const result = await response.json();
      toast.success(`Imported ${result.imported} label(s)`);
      loadLabels();
    } catch (error) {
      console.error("Error importing labels:", error);
      toast.error("Failed to import labels");
    }
  };

  const handleImportTemplate = async (template: keyof typeof LABEL_TEMPLATES) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/labels/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labels: LABEL_TEMPLATES[template],
          mode: "merge",
        }),
      });

      if (!response.ok) throw new Error("Failed to import template");

      const result = await response.json();
      toast.success(`Imported ${result.imported} label(s) from template`);
      loadLabels();
    } catch (error) {
      console.error("Error importing template:", error);
      toast.error("Failed to import template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Label Management</h2>
          <p className="text-muted-foreground text-sm">
            Create and manage labels for this board
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleImport(file);
              };
              input.click();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <CreateLabelDialog boardId={boardId} onLabelCreated={loadLabels} />
        </div>
      </div>

      <Tabs defaultValue="labels" className="w-full">
        <TabsList>
          <TabsTrigger value="labels">Labels ({labels.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="labels" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading labels...
            </div>
          ) : labels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No labels yet</p>
                <CreateLabelDialog
                  boardId={boardId}
                  onLabelCreated={loadLabels}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Label
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {labels.map((label) => (
                <Card key={label.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <LabelBadge label={label} />
                      <div className="flex-1">
                        {label.description && (
                          <p className="text-sm text-muted-foreground">
                            {label.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Used on {label._count.taskLabels} task(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <EditLabelDialog
                        boardId={boardId}
                        label={label}
                        onLabelUpdated={loadLabels}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, label })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {Object.entries(LABEL_TEMPLATES).map(([key, template]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="capitalize">{key}</CardTitle>
                <CardDescription>
                  {template.length} predefined labels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {template.map((label, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium"
                      style={{
                        backgroundColor: label.color,
                        color:
                          parseInt(label.color.slice(1), 16) > 0xffffff / 2
                            ? "#000"
                            : "#fff",
                      }}
                      title={label.description}
                    >
                      {label.name}
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleImportTemplate(key as keyof typeof LABEL_TEMPLATES)
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Import Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, label: deleteDialog.label })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Label</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the label "
              {deleteDialog.label?.name}"? This will remove it from all tasks.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
