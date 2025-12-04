"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp, Users } from "lucide-react";

type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  coverImage: string;
  isPredefined: boolean;
  isPublic: boolean;
  usageCount: number;
  rating: number;
  lists: Array<{
    id: string;
    name: string;
    position: number;
    color: string;
    emoji: string;
    tasks: Array<{
      id: string;
      title: string;
      emoji: string;
    }>;
  }>;
};

type Organization = {
  id: string;
  name: string;
};

const categoryLabels: Record<string, string> = {
  all: "All Templates",
  sprint: "Sprint Planning",
  roadmap: "Product Roadmap",
  calendar: "Content Calendar",
  bugtracking: "Bug Tracking",
  onboarding: "Onboarding",
  event: "Event Planning",
  custom: "Custom",
};

const categoryColors: Record<string, string> = {
  sprint: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  roadmap: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  calendar: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  bugtracking: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  onboarding: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  event: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [useTemplateDialog, setUseTemplateDialog] = useState<Template | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter((t) => t.category === selectedCategory));
    }
  }, [selectedCategory, templates]);

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to load templates");
      const data = await response.json();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await fetch("/api/organizations");
      if (!response.ok) throw new Error("Failed to load organizations");
      const data = await response.json();
      setOrganizations(data);
      if (data.length > 0) {
        setSelectedOrg(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  };

  const handleUseTemplate = async () => {
    if (!useTemplateDialog || !selectedOrg) return;

    setCreating(true);
    try {
      const response = await fetch(`/api/boards/from-template/${useTemplateDialog.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedOrg }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create board");
      }

      const board = await response.json();

      toast.success(`✅ ${board.name} has been created successfully`);

      // Redirect to the new board
      window.location.href = `/dashboard/boards/${board.id}`;
    } catch (error: any) {
      toast.error(error.message || "Failed to create board from template");
    } finally {
      setCreating(false);
      setUseTemplateDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          Template Marketplace
        </h1>
        <p className="text-muted-foreground">
          Choose from pre-built templates to kickstart your boards
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={selectedCategory === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <div
                className="h-32 rounded-t-lg"
                style={{ background: template.coverImage }}
              />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="text-lg">{template.name.replace(/^[^\s]+\s/, "")}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[template.category]}>
                    {categoryLabels[template.category]}
                  </Badge>
                  {template.isPredefined && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Official
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {template.usageCount} uses
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {template.lists.length} lists
                  </div>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPreviewTemplate(template)}
                >
                  Preview
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setUseTemplateDialog(template)}
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{previewTemplate?.icon}</span>
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className={categoryColors[previewTemplate?.category || "custom"]}>
                {categoryLabels[previewTemplate?.category || "custom"]}
              </Badge>
              <Badge variant="secondary">{previewTemplate?.lists.length} Lists</Badge>
              <Badge variant="secondary">
                {previewTemplate?.lists.reduce((acc, list) => acc + list.tasks.length, 0)} Tasks
              </Badge>
            </div>
            <div className="space-y-4">
              {previewTemplate?.lists.map((list) => (
                <div key={list.id} className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span>{list.emoji}</span>
                    {list.name}
                  </h3>
                  <div className="space-y-1">
                    {list.tasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="text-sm text-muted-foreground flex items-center gap-2 pl-4"
                      >
                        <span>{task.emoji}</span>
                        {task.title}
                      </div>
                    ))}
                    {list.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-4">
                        +{list.tasks.length - 3} more tasks...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewTemplate(null);
                if (previewTemplate) setUseTemplateDialog(previewTemplate);
              }}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Template Dialog */}
      <Dialog open={!!useTemplateDialog} onOpenChange={() => setUseTemplateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Board from Template</DialogTitle>
            <DialogDescription>
              Select an organization to create this board in
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <span className="text-2xl">{useTemplateDialog?.icon}</span>
                <span className="font-medium">{useTemplateDialog?.name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseTemplateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleUseTemplate} disabled={creating || !selectedOrg}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
