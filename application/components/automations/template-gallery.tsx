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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Search, Zap, Star, TrendingUp, ArrowRight } from "lucide-react";
import {
  AutomationTemplate,
  TRIGGER_METADATA,
  ACTION_METADATA,
  TEMPLATE_CATEGORIES,
} from "./types";
import { toast } from "sonner";

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: AutomationTemplate) => void;
}

// Predefined templates
const PREDEFINED_TEMPLATES: AutomationTemplate[] = [
  {
    id: "tmpl_due_date_urgent",
    name: "Déplacer vers Urgent à l'approche de l'échéance",
    description: "Quand une carte a une date d'échéance dans moins de 2 jours, la déplacer automatiquement vers la liste 'Urgent'",
    category: "productivity",
    icon: "⏰",
    triggerType: "due_date_approaching",
    triggerConfig: { daysBeforeDue: 2 },
    conditions: [],
    actions: [
      { type: "move_card", targetListId: "" }, // Will be configured on use
      { type: "add_label", labelName: "Urgent", createIfMissing: true },
    ],
    usageCount: 1250,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_checklist_done",
    name: "Ajouter label Review quand checklist complétée",
    description: "Quand tous les éléments d'une checklist sont cochés, ajouter automatiquement le label 'Review'",
    category: "productivity",
    icon: "✅",
    triggerType: "checklist_completed",
    triggerConfig: {},
    conditions: [],
    actions: [
      { type: "add_label", labelName: "Review", createIfMissing: true },
    ],
    usageCount: 890,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_assign_creator",
    name: "Assigner au créateur",
    description: "Quand une nouvelle carte est créée, l'assigner automatiquement à son créateur",
    category: "organization",
    icon: "👤",
    triggerType: "card_created",
    triggerConfig: {},
    conditions: [],
    actions: [{ type: "assign_member", assignCreator: true }],
    usageCount: 2100,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_mention_notify",
    name: "Notification sur @mention",
    description: "Quand quelqu'un est mentionné dans un commentaire, lui envoyer une notification",
    category: "notifications",
    icon: "@",
    triggerType: "comment_mention",
    triggerConfig: {},
    conditions: [],
    actions: [
      {
        type: "send_notification",
        notifyType: "assignee",
        notificationTitle: "Vous avez été mentionné",
        notificationMessage: "Quelqu'un vous a mentionné dans un commentaire",
      },
    ],
    usageCount: 1560,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_archive_done",
    name: "Archiver les cartes terminées",
    description: "Quand une carte est déplacée vers 'Done', l'archiver automatiquement après 7 jours",
    category: "organization",
    icon: "📦",
    triggerType: "card_moved",
    triggerConfig: {}, // toListId will be configured
    conditions: [],
    actions: [{ type: "archive_card" }],
    usageCount: 780,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_overdue_notify",
    name: "Notifier quand en retard",
    description: "Quand la date d'échéance est dépassée, notifier l'assigné et les membres du board",
    category: "notifications",
    icon: "⚠️",
    triggerType: "due_date_passed",
    triggerConfig: {},
    conditions: [],
    actions: [
      {
        type: "send_notification",
        notifyType: "assignee",
        notificationTitle: "Carte en retard",
        notificationMessage: "La carte {{task.title}} a dépassé sa date d'échéance",
      },
      { type: "add_label", labelName: "En retard", createIfMissing: true },
    ],
    usageCount: 1100,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_webhook_slack",
    name: "Envoyer vers Slack",
    description: "Quand une carte est créée, envoyer une notification vers Slack via webhook",
    category: "integrations",
    icon: "🔗",
    triggerType: "card_created",
    triggerConfig: {},
    conditions: [],
    actions: [
      {
        type: "send_webhook",
        webhookUrl: "",
        webhookMethod: "POST",
        webhookPayload: JSON.stringify({
          text: "Nouvelle carte créée: {{task.title}}",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "*Nouvelle carte:* {{task.title}}",
              },
            },
          ],
        }),
      },
    ],
    usageCount: 650,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_set_deadline",
    name: "Date d'échéance automatique",
    description: "Quand une carte est créée, définir automatiquement une date d'échéance à 7 jours",
    category: "productivity",
    icon: "📅",
    triggerType: "card_created",
    triggerConfig: {},
    conditions: [],
    actions: [{ type: "set_due_date", dueDateOffset: 7, dueDateHour: 17 }],
    usageCount: 920,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_review_checklist",
    name: "Créer checklist de review",
    description: "Quand le label 'Review' est ajouté, créer une checklist de vérification",
    category: "organization",
    icon: "☑️",
    triggerType: "label_added",
    triggerConfig: { labelName: "Review" },
    conditions: [],
    actions: [
      {
        type: "create_checklist",
        checklistName: "Review Checklist",
        checklistItems: [
          "Vérifier le code",
          "Tester les fonctionnalités",
          "Vérifier la documentation",
          "Valider avec l'équipe",
        ],
      },
    ],
    usageCount: 540,
    isPredefined: true,
    isPublic: true,
  },
  {
    id: "tmpl_copy_on_done",
    name: "Copier vers archive",
    description: "Quand une carte est marquée comme terminée, créer une copie dans la liste Archive",
    category: "organization",
    icon: "📋",
    triggerType: "card_moved",
    triggerConfig: {},
    conditions: [],
    actions: [
      { type: "copy_card", copyTitle: "{{task.title}} [Archivé]" },
    ],
    usageCount: 380,
    isPredefined: true,
    isPublic: true,
  },
];

export function TemplateGallery({
  open,
  onClose,
  onSelect,
}: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<AutomationTemplate[]>(PREDEFINED_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    if (open) {
      // Could fetch custom templates from API here
      // For now, we use predefined templates
    }
  }, [open]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      search === "" ||
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      activeCategory === "all" || template.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const popularTemplates = [...templates]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Galerie de modèles
          </DialogTitle>
          <DialogDescription>
            Choisissez un modèle pour démarrer rapidement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un modèle..."
              className="pl-10"
            />
          </div>

          {/* Popular */}
          {search === "" && activeCategory === "all" && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                Populaires
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {popularTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => onSelect(template)}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-4">
              <div className="max-h-[45vh] overflow-y-auto pr-2">
                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Aucun modèle trouvé</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onSelect(template)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onSelect,
  compact = false,
}: {
  template: AutomationTemplate;
  onSelect: () => void;
  compact?: boolean;
}) {
  const triggerMeta = TRIGGER_METADATA[template.triggerType];
  const category = TEMPLATE_CATEGORIES.find((c) => c.value === template.category);

  return (
    <Card
      className={cn(
        "cursor-pointer hover:border-primary hover:shadow-md transition-all group",
        compact && "p-3"
      )}
      onClick={onSelect}
    >
      <CardContent className={cn("p-4", compact && "p-0")}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">{template.icon}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {template.name}
            </h4>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}

            {/* Flow visualization */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs gap-1">
                <span>{triggerMeta?.icon}</span>
                {compact ? "" : triggerMeta?.label}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              {template.actions.slice(0, compact ? 1 : 2).map((action, i) => {
                const actionMeta = ACTION_METADATA[action.type];
                return (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    <span>{actionMeta?.icon}</span>
                    {compact ? "" : actionMeta?.label}
                  </Badge>
                );
              })}
              {template.actions.length > (compact ? 1 : 2) && (
                <Badge variant="secondary" className="text-xs">
                  +{template.actions.length - (compact ? 1 : 2)}
                </Badge>
              )}
            </div>

            {/* Stats */}
            {!compact && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {template.usageCount.toLocaleString()}x utilisé
                </span>
                <Badge variant="outline" className="text-xs">
                  {category?.icon} {category?.label}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
