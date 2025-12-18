"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Zap,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  History,
  Play,
  Pause,
  Copy,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { RuleBuilder } from "./rule-builder";
import { AutomationLogs } from "./automation-logs";
import { TemplateGallery } from "./template-gallery";
import {
  AutomationRule,
  TriggerType,
  ActionConfig,
  TRIGGER_METADATA,
  ACTION_METADATA,
} from "./types";
import { toast } from "sonner";

interface AutomationListProps {
  boardId: string;
  lists: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  members: { id: string; name: string; image?: string }[];
}

export function AutomationList({
  boardId,
  lists,
  labels,
  members,
}: AutomationListProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, [boardId]);

  const fetchRules = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch (error) {
      console.error("Error fetching automations:", error);
      toast.error("Erreur lors du chargement des automatisations");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (ruleData: any) => {
    const url = editingRule
      ? `/api/boards/${boardId}/automations/${editingRule.id}`
      : `/api/boards/${boardId}/automations`;
    const method = editingRule ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ruleData),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to save rule");
    }

    const data = await res.json();

    if (editingRule) {
      setRules(rules.map((r) => (r.id === editingRule.id ? data.rule : r)));
      toast.success("Automatisation mise à jour");
    } else {
      setRules([data.rule, ...rules]);
      toast.success("Automatisation créée");
    }

    setEditingRule(null);
  };

  const handleToggleEnabled = async (ruleId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });

      if (res.ok) {
        setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
        toast.success(enabled ? "Automatisation activée" : "Automatisation désactivée");
      }
    } catch (error) {
      console.error("Error toggling rule:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setRules(rules.filter((r) => r.id !== ruleId));
        toast.success("Automatisation supprimée");
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Erreur lors de la suppression");
    }
    setDeleteConfirm(null);
  };

  const handleDuplicateRule = async (rule: AutomationRule) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: `${rule.name} (Copie)`,
          description: rule.description,
          triggerType: rule.triggerType,
          triggerConfig: rule.triggerConfig,
          conditions: rule.conditions,
          actions: rule.actions,
          enabled: false,
          priority: rule.priority,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRules([data.rule, ...rules]);
        toast.success("Automatisation dupliquée");
      }
    } catch (error) {
      console.error("Error duplicating rule:", error);
      toast.error("Erreur lors de la duplication");
    }
  };

  const handleTestRule = async (ruleId: string) => {
    try {
      const res = await fetch(
        `/api/boards/${boardId}/automations/${ruleId}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          `Test exécuté: ${data.result.rulesExecuted} règle(s) déclenchée(s)`
        );
      } else {
        toast.error(data.error || "Échec du test");
      }
    } catch (error) {
      console.error("Error testing rule:", error);
      toast.error("Erreur lors du test");
    }
  };

  const handleSelectTemplate = async (template: any) => {
    setShowTemplates(false);
    setEditingRule({
      id: "",
      name: template.name,
      description: template.description,
      boardId,
      enabled: true,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      conditions: template.conditions,
      actions: template.actions,
      isTemplate: false,
      templateId: template.id,
      priority: 0,
      executionCount: 0,
      createdById: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AutomationRule);
    setShowBuilder(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Automatisations
          </h2>
          <p className="text-muted-foreground">
            Créez des règles pour automatiser vos workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)}>
            Modèles
          </Button>
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Aucune automatisation
          </h3>
          <p className="text-muted-foreground mb-6">
            Créez votre première règle pour automatiser vos tâches
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              Parcourir les modèles
            </Button>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une règle
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              lists={lists}
              onToggle={(enabled) => handleToggleEnabled(rule.id, enabled)}
              onEdit={() => {
                setEditingRule(rule);
                setShowBuilder(true);
              }}
              onDelete={() => setDeleteConfirm(rule.id)}
              onDuplicate={() => handleDuplicateRule(rule)}
              onViewLogs={() => setShowLogs(rule.id)}
              onTest={() => handleTestRule(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Rule Builder Dialog */}
      {(showBuilder || editingRule) && (
        <RuleBuilder
          open={showBuilder || !!editingRule}
          onClose={() => {
            setShowBuilder(false);
            setEditingRule(null);
          }}
          onSave={handleSaveRule}
          boardLists={lists}
          boardLabels={labels}
          boardMembers={members}
          initialRule={editingRule}
        />
      )}

      {/* Template Gallery */}
      {showTemplates && (
        <TemplateGallery
          open={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelect={handleSelectTemplate}
        />
      )}

      {/* Automation Logs */}
      {showLogs && (
        <AutomationLogs
          open={!!showLogs}
          onClose={() => setShowLogs(null)}
          boardId={boardId}
          ruleId={showLogs}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'automatisation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'historique d'exécution sera
              également supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteRule(deleteConfirm)}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Rule Card Component
function RuleCard({
  rule,
  lists,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onViewLogs,
  onTest,
}: {
  rule: AutomationRule;
  lists: { id: string; name: string }[];
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onViewLogs: () => void;
  onTest: () => void;
}) {
  const triggerMeta = TRIGGER_METADATA[rule.triggerType as TriggerType];
  const getListName = (id?: string) => lists.find((l) => l.id === id)?.name || id;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        !rule.enabled && "opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Rule Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Switch
                checked={rule.enabled}
                onCheckedChange={onToggle}
                aria-label="Toggle automation"
              />
              <h3 className="font-semibold truncate">{rule.name}</h3>
              {rule.executionCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {rule.executionCount}x
                </Badge>
              )}
            </div>

            {rule.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                {rule.description}
              </p>
            )}

            {/* Trigger → Actions Flow */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <span>{triggerMeta?.icon}</span>
                <span>{triggerMeta?.label}</span>
              </Badge>

              {rule.triggerConfig?.toListId && (
                <span className="text-xs text-muted-foreground">
                  → {getListName(rule.triggerConfig.toListId)}
                </span>
              )}

              <ArrowRight className="h-4 w-4 text-muted-foreground" />

              {rule.actions.slice(0, 3).map((action, i) => {
                const actionMeta = ACTION_METADATA[action.type];
                return (
                  <Badge key={i} variant="secondary" className="gap-1">
                    <span>{actionMeta?.icon}</span>
                    <span>{actionMeta?.label}</span>
                  </Badge>
                );
              })}
              {rule.actions.length > 3 && (
                <Badge variant="secondary">+{rule.actions.length - 3}</Badge>
              )}
            </div>

            {/* Conditions */}
            {rule.conditions.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {rule.conditions.length} condition(s)
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewLogs}>
                <History className="h-4 w-4 mr-2" />
                Historique
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTest}>
                <Play className="h-4 w-4 mr-2" />
                Tester
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
