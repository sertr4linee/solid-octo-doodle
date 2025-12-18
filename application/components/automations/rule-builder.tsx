"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Filter,
  Play,
} from "lucide-react";
import {
  TriggerType,
  ActionType,
  ActionConfig,
  Condition,
  TriggerConfig,
  TRIGGER_METADATA,
  ACTION_METADATA,
  CONDITION_OPERATORS,
  CONDITION_FIELDS,
} from "./types";

interface RuleBuilderProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: {
    name: string;
    description?: string;
    triggerType: TriggerType;
    triggerConfig: TriggerConfig;
    conditions: Condition[];
    actions: ActionConfig[];
    enabled: boolean;
    priority: number;
  }) => Promise<void>;
  boardLists: { id: string; name: string }[];
  boardLabels: { id: string; name: string; color: string }[];
  boardMembers: { id: string; name: string; image?: string }[];
  initialRule?: any;
}

export function RuleBuilder({
  open,
  onClose,
  onSave,
  boardLists,
  boardLabels,
  boardMembers,
  initialRule,
}: RuleBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialRule?.name || "");
  const [description, setDescription] = useState(initialRule?.description || "");
  const [triggerType, setTriggerType] = useState<TriggerType | "">(
    initialRule?.triggerType || ""
  );
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(
    initialRule?.triggerConfig || {}
  );
  const [conditions, setConditions] = useState<Condition[]>(
    initialRule?.conditions || []
  );
  const [actions, setActions] = useState<ActionConfig[]>(
    initialRule?.actions || []
  );
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [priority, setPriority] = useState(initialRule?.priority || 0);
  const [showConditions, setShowConditions] = useState(conditions.length > 0);

  const handleSave = async () => {
    if (!name.trim() || !triggerType || actions.length === 0) return;

    setLoading(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        triggerType: triggerType as TriggerType,
        triggerConfig,
        conditions,
        actions,
        enabled,
        priority,
      });
      onClose();
    } catch (error) {
      console.error("Error saving rule:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAction = () => {
    setActions([...actions, { type: "move_card" }]);
  };

  const updateAction = (index: number, updates: Partial<ActionConfig>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "task.title", operator: "contains", value: "" },
    ]);
    setShowConditions(true);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const triggerGroups = Object.entries(TRIGGER_METADATA).reduce(
    (acc, [key, meta]) => {
      if (!acc[meta.category]) acc[meta.category] = [];
      acc[meta.category].push({ key, ...meta });
      return acc;
    },
    {} as Record<string, any[]>
  );

  const actionGroups = Object.entries(ACTION_METADATA).reduce(
    (acc, [key, meta]) => {
      if (!acc[meta.category]) acc[meta.category] = [];
      acc[meta.category].push({ key, ...meta });
      return acc;
    },
    {} as Record<string, any[]>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {initialRule ? "Modifier l'automatisation" : "Nouvelle automatisation"}
          </DialogTitle>
          <DialogDescription>
            Créez une règle if-then pour automatiser vos workflows
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name & Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la règle *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Déplacer les cartes urgentes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez ce que fait cette automatisation..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Trigger Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Quand... (Déclencheur)</h3>
            </div>

            <Select
              value={triggerType}
              onValueChange={(v) => {
                setTriggerType(v as TriggerType);
                setTriggerConfig({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un déclencheur" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(triggerGroups).map(([category, triggers]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground capitalize">
                      {category}
                    </div>
                    {triggers.map((trigger) => (
                      <SelectItem key={trigger.key} value={trigger.key}>
                        <span className="flex items-center gap-2">
                          <span>{trigger.icon}</span>
                          <span>{trigger.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            {/* Trigger Config */}
            {triggerType && (
              <TriggerConfigForm
                triggerType={triggerType as TriggerType}
                config={triggerConfig}
                onChange={setTriggerConfig}
                lists={boardLists}
                labels={boardLabels}
                members={boardMembers}
              />
            )}
          </div>

          <Separator />

          {/* Conditions (Optional) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowConditions(!showConditions)}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Filter className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Conditions (optionnel)</h3>
                {showConditions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {conditions.length > 0 && (
                <Badge variant="secondary">{conditions.length} condition(s)</Badge>
              )}
            </div>

            {showConditions && (
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={condition.field}
                        onValueChange={(v) => updateCondition(index, { field: v })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(v) =>
                          updateCondition(index, { operator: v as any })
                        }
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                        <Input
                          value={condition.value || ""}
                          onChange={(e) =>
                            updateCondition(index, { value: e.target.value })
                          }
                          placeholder="Valeur..."
                          className="flex-1"
                        />
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCondition(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une condition
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Alors... (Actions)</h3>
            </div>

            <div className="space-y-3">
              {actions.map((action, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Select
                        value={action.type}
                        onValueChange={(v) =>
                          updateAction(index, { type: v as ActionType })
                        }
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(actionGroups).map(([category, acts]) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground capitalize">
                                {category}
                              </div>
                              {acts.map((act) => (
                                <SelectItem key={act.key} value={act.key}>
                                  <span className="flex items-center gap-2">
                                    <span>{act.icon}</span>
                                    <span>{act.label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Action Config */}
                    <ActionConfigForm
                      actionType={action.type}
                      config={action}
                      onChange={(updates) => updateAction(index, updates)}
                      lists={boardLists}
                      labels={boardLabels}
                      members={boardMembers}
                    />
                  </div>
                </Card>
              ))}

              <Button variant="outline" onClick={addAction}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une action
              </Button>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <Label htmlFor="enabled">Activée</Label>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="priority" className="text-sm">
                  Priorité:
                </Label>
                <Input
                  id="priority"
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  className="w-20"
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim() || !triggerType || actions.length === 0}
          >
            {loading ? "Enregistrement..." : initialRule ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Trigger Config Form
function TriggerConfigForm({
  triggerType,
  config,
  onChange,
  lists,
  labels,
  members,
}: {
  triggerType: TriggerType;
  config: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
  lists: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  members: { id: string; name: string; image?: string }[];
}) {
  const meta = TRIGGER_METADATA[triggerType];
  if (!meta.configFields || meta.configFields.length === 0) return null;

  return (
    <div className="pl-4 border-l-2 border-blue-200 space-y-3">
      {meta.configFields.includes("fromListId") && (
        <div className="space-y-2">
          <Label>De la liste (optionnel)</Label>
          <Select
            value={config.fromListId || ""}
            onValueChange={(v) => onChange({ ...config, fromListId: v || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les listes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les listes</SelectItem>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {meta.configFields.includes("toListId") && (
        <div className="space-y-2">
          <Label>Vers la liste (optionnel)</Label>
          <Select
            value={config.toListId || ""}
            onValueChange={(v) => onChange({ ...config, toListId: v || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les listes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les listes</SelectItem>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {meta.configFields.includes("daysBeforeDue") && (
        <div className="flex items-center gap-4">
          <div className="space-y-2 flex-1">
            <Label>Jours avant l'échéance</Label>
            <Input
              type="number"
              value={config.daysBeforeDue || ""}
              onChange={(e) =>
                onChange({
                  ...config,
                  daysBeforeDue: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="1"
              min={0}
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label>Heures avant l'échéance</Label>
            <Input
              type="number"
              value={config.hoursBeforeDue || ""}
              onChange={(e) =>
                onChange({
                  ...config,
                  hoursBeforeDue: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="24"
              min={0}
            />
          </div>
        </div>
      )}

      {(meta.configFields.includes("labelId") || meta.configFields.includes("labelName")) && (
        <div className="space-y-2">
          <Label>Label spécifique (optionnel)</Label>
          <Select
            value={config.labelId || ""}
            onValueChange={(v) => onChange({ ...config, labelId: v || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les labels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les labels</SelectItem>
              {labels.map((label) => (
                <SelectItem key={label.id} value={label.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {meta.configFields.includes("memberId") && (
        <div className="space-y-2">
          <Label>Membre spécifique (optionnel)</Label>
          <Select
            value={config.memberId || ""}
            onValueChange={(v) => onChange({ ...config, memberId: v || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les membres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les membres</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {meta.configFields.includes("checklistName") && (
        <div className="space-y-2">
          <Label>Nom de la checklist (optionnel)</Label>
          <Input
            value={config.checklistName || ""}
            onChange={(e) =>
              onChange({ ...config, checklistName: e.target.value || undefined })
            }
            placeholder="Toutes les checklists"
          />
        </div>
      )}
    </div>
  );
}

// Action Config Form
function ActionConfigForm({
  actionType,
  config,
  onChange,
  lists,
  labels,
  members,
}: {
  actionType: ActionType;
  config: ActionConfig;
  onChange: (updates: Partial<ActionConfig>) => void;
  lists: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  members: { id: string; name: string; image?: string }[];
}) {
  const meta = ACTION_METADATA[actionType];

  return (
    <div className="space-y-3">
      {/* Move Card */}
      {actionType === "move_card" && (
        <div className="space-y-2">
          <Label>Déplacer vers la liste *</Label>
          <Select
            value={config.targetListId || ""}
            onValueChange={(v) => onChange({ targetListId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une liste" />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assign Member */}
      {actionType === "assign_member" && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.assignCreator || false}
                onCheckedChange={(v) =>
                  onChange({ assignCreator: v, userId: undefined, assignRandom: false })
                }
              />
              <Label>Assigner au créateur</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.assignRandom || false}
                onCheckedChange={(v) =>
                  onChange({ assignRandom: v, userId: undefined, assignCreator: false })
                }
              />
              <Label>Assigner aléatoirement</Label>
            </div>
          </div>
          {!config.assignCreator && !config.assignRandom && (
            <div className="space-y-2">
              <Label>Membre spécifique</Label>
              <Select
                value={config.userId || ""}
                onValueChange={(v) => onChange({ userId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Add/Remove Label */}
      {(actionType === "add_label" || actionType === "remove_label") && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Label</Label>
            <Select
              value={config.labelId || ""}
              onValueChange={(v) => onChange({ labelId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un label" />
              </SelectTrigger>
              <SelectContent>
                {labels.map((label) => (
                  <SelectItem key={label.id} value={label.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!config.labelId && (
            <div className="space-y-2">
              <Label>Ou par nom</Label>
              <Input
                value={config.labelName || ""}
                onChange={(e) => onChange({ labelName: e.target.value })}
                placeholder="Nom du label"
              />
            </div>
          )}
          {actionType === "add_label" && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.createIfMissing || false}
                onCheckedChange={(v) => onChange({ createIfMissing: v })}
              />
              <Label>Créer le label s'il n'existe pas</Label>
            </div>
          )}
        </div>
      )}

      {/* Add Comment */}
      {actionType === "add_comment" && (
        <div className="space-y-2">
          <Label>Contenu du commentaire *</Label>
          <Textarea
            value={config.commentContent || ""}
            onChange={(e) => onChange({ commentContent: e.target.value })}
            placeholder="Utilisez {{task.title}}, {{user.name}} pour les variables..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Variables disponibles: {"{{task.title}}"}, {"{{task.description}}"}, {"{{user.name}}"}
          </p>
        </div>
      )}

      {/* Send Notification */}
      {actionType === "send_notification" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Notifier</Label>
            <Select
              value={config.notifyType || "assignee"}
              onValueChange={(v) => onChange({ notifyType: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignee">L'assigné</SelectItem>
                <SelectItem value="creator">Le créateur</SelectItem>
                <SelectItem value="board_members">Tous les membres du tableau</SelectItem>
                <SelectItem value="specific">Membres spécifiques</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titre de la notification</Label>
            <Input
              value={config.notificationTitle || ""}
              onChange={(e) => onChange({ notificationTitle: e.target.value })}
              placeholder="Alerte automatique"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={config.notificationMessage || ""}
              onChange={(e) => onChange({ notificationMessage: e.target.value })}
              placeholder="Une automatisation a été déclenchée..."
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Send Webhook */}
      {actionType === "send_webhook" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>URL du webhook *</Label>
            <Input
              value={config.webhookUrl || ""}
              onChange={(e) => onChange({ webhookUrl: e.target.value })}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div className="space-y-2">
            <Label>Méthode HTTP</Label>
            <Select
              value={config.webhookMethod || "POST"}
              onValueChange={(v) => onChange({ webhookMethod: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payload JSON (optionnel)</Label>
            <Textarea
              value={config.webhookPayload || ""}
              onChange={(e) => onChange({ webhookPayload: e.target.value })}
              placeholder='{"event": "{{triggerType}}", "task": "{{task.title}}"}'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Set Due Date */}
      {actionType === "set_due_date" && (
        <div className="flex items-center gap-4">
          <div className="space-y-2 flex-1">
            <Label>Dans X jours</Label>
            <Input
              type="number"
              value={config.dueDateOffset || ""}
              onChange={(e) =>
                onChange({ dueDateOffset: parseInt(e.target.value) || 0 })
              }
              placeholder="7"
              min={0}
            />
          </div>
          <div className="space-y-2 flex-1">
            <Label>À l'heure</Label>
            <Input
              type="number"
              value={config.dueDateHour ?? ""}
              onChange={(e) =>
                onChange({ dueDateHour: parseInt(e.target.value) || undefined })
              }
              placeholder="17"
              min={0}
              max={23}
            />
          </div>
        </div>
      )}

      {/* Copy Card */}
      {actionType === "copy_card" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Copier vers la liste</Label>
            <Select
              value={config.copyToListId || ""}
              onValueChange={(v) => onChange({ copyToListId: v || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Même liste" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Même liste</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titre de la copie</Label>
            <Input
              value={config.copyTitle || ""}
              onChange={(e) => onChange({ copyTitle: e.target.value || undefined })}
              placeholder="{{task.title}} (Copie)"
            />
          </div>
        </div>
      )}

      {/* Create Checklist */}
      {actionType === "create_checklist" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nom de la checklist *</Label>
            <Input
              value={config.checklistName || ""}
              onChange={(e) => onChange({ checklistName: e.target.value })}
              placeholder="À vérifier"
            />
          </div>
          <div className="space-y-2">
            <Label>Éléments (un par ligne)</Label>
            <Textarea
              value={(config.checklistItems || []).join("\n")}
              onChange={(e) =>
                onChange({
                  checklistItems: e.target.value.split("\n").filter(Boolean),
                })
              }
              placeholder="Élément 1&#10;Élément 2&#10;Élément 3"
              rows={4}
            />
          </div>
        </div>
      )}
    </div>
  );
}
