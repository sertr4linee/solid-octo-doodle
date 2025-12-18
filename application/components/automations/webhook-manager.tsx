"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Webhook,
  Plus,
  MoreVertical,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Link2,
  Shield,
} from "lucide-react";
import { AutomationWebhook, ActionConfig, ACTION_METADATA } from "./types";
import { toast } from "sonner";

interface WebhookManagerProps {
  boardId: string;
}

export function WebhookManager({ boardId }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<AutomationWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, [boardId]);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations/webhooks`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast.error("Erreur lors du chargement des webhooks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (data: {
    name: string;
    description?: string;
    actions: ActionConfig[];
    enabled: boolean;
    requireSignature: boolean;
  }) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        setWebhooks([result.webhook, ...webhooks]);
        setNewWebhookSecret(result.webhook.secret);
        toast.success("Webhook créé avec succès");
        setShowCreate(false);
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
      toast.error("Erreur lors de la création du webhook");
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const res = await fetch(
        `/api/boards/${boardId}/automations/webhooks/${webhookId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.ok) {
        setWebhooks(webhooks.filter((w) => w.id !== webhookId));
        toast.success("Webhook supprimé");
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Webhooks entrants
          </h3>
          <p className="text-sm text-muted-foreground">
            Recevez des événements externes pour déclencher des actions
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <Card className="p-8 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun webhook configuré</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowCreate(true)}
          >
            Créer un webhook
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onCopyUrl={() =>
                copyToClipboard(webhook.webhookUrl, "URL copiée")
              }
              onDelete={() => handleDeleteWebhook(webhook.id)}
            />
          ))}
        </div>
      )}

      {/* Create Webhook Dialog */}
      <CreateWebhookDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateWebhook}
      />

      {/* New Webhook Secret Dialog */}
      {newWebhookSecret && (
        <Dialog open={!!newWebhookSecret} onOpenChange={() => setNewWebhookSecret(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-500" />
                Secret du webhook
              </DialogTitle>
              <DialogDescription>
                Sauvegardez ce secret maintenant. Il ne sera plus affiché après fermeture.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {newWebhookSecret}
              </div>
              <Button
                onClick={() => {
                  copyToClipboard(newWebhookSecret, "Secret copié");
                }}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier le secret
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewWebhookSecret(null)}>
                J'ai sauvegardé le secret
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Webhook Card Component
function WebhookCard({
  webhook,
  onCopyUrl,
  onDelete,
}: {
  webhook: AutomationWebhook;
  onCopyUrl: () => void;
  onDelete: () => void;
}) {
  const [showUrl, setShowUrl] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{webhook.name}</h4>
              <Badge variant={webhook.enabled ? "default" : "secondary"}>
                {webhook.enabled ? "Actif" : "Inactif"}
              </Badge>
              {webhook.requireSignature && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Signé
                </Badge>
              )}
            </div>

            {webhook.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {webhook.description}
              </p>
            )}

            {/* URL */}
            <div className="flex items-center gap-2 mb-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-md">
                {showUrl ? webhook.webhookUrl : "••••••••••••••••••••"}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowUrl(!showUrl)}
              >
                {showUrl ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onCopyUrl}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {webhook.actions.map((action, i) => {
                const meta = ACTION_METADATA[action.type];
                return (
                  <Badge key={i} variant="secondary" className="text-xs gap-1">
                    <span>{meta?.icon}</span>
                    <span>{meta?.label}</span>
                  </Badge>
                );
              })}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{webhook.callCount} appels</span>
              {webhook.lastCalledAt && (
                <span>
                  Dernier: {new Date(webhook.lastCalledAt).toLocaleString("fr-FR")}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copier l'URL
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

// Create Webhook Dialog
function CreateWebhookDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requireSignature, setRequireSignature] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [actions, setActions] = useState<ActionConfig[]>([
    { type: "send_notification", notifyType: "board_members" },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || actions.length === 0) return;

    setLoading(true);
    try {
      await onCreate({
        name,
        description: description || undefined,
        actions,
        enabled,
        requireSignature,
      });
      // Reset form
      setName("");
      setDescription("");
      setActions([{ type: "send_notification", notifyType: "board_members" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau webhook entrant</DialogTitle>
          <DialogDescription>
            Créez un endpoint pour recevoir des événements externes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon webhook"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Signature requise</Label>
              <p className="text-xs text-muted-foreground">
                Vérifier les requêtes avec HMAC-SHA256
              </p>
            </div>
            <Switch
              checked={requireSignature}
              onCheckedChange={setRequireSignature}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Actif</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
