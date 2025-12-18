"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Send,
  Github,
  Webhook,
  Key,
  Settings,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Activity,
  Link2,
  MessageCircle,
} from "lucide-react";

// Integration types configuration
const INTEGRATION_TYPES = {
  telegram: {
    name: "Telegram",
    description: "Receive notifications and create tasks via Telegram bot",
    icon: Send,
    color: "bg-[#0088cc]",
    features: ["Notifications", "Commands", "Task creation"],
    oauthUrl: null, // Uses bot token, not OAuth
    requiresToken: true,
  },
  github: {
    name: "GitHub",
    description: "Link issues, PRs, and commits to cards",
    icon: Github,
    color: "bg-[#24292e]",
    features: ["Link issues", "Link PRs", "Auto-updates"],
    oauthUrl: "/api/integrations/github/oauth",
  },
  google_drive: {
    name: "Google Drive",
    description: "Attach files from Google Drive to cards",
    icon: FileText,
    color: "bg-[#4285F4]",
    features: ["File attachments", "Preview", "Sync"],
    oauthUrl: "/api/integrations/google/oauth",
  },
  webhook: {
    name: "Webhooks",
    description: "Send events to external services",
    icon: Webhook,
    color: "bg-[#6366F1]",
    features: ["Real-time events", "Custom payloads", "Retries"],
    oauthUrl: null,
  },
};

type IntegrationType = keyof typeof INTEGRATION_TYPES;

interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  description?: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  lastUsedAt?: string;
  organizationId?: string;
  boardId?: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimit: number;
  requestCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  enabled: boolean;
  createdAt: string;
}

export default function ConnectionsPage() {
  const [activeTab, setActiveTab] = useState("integrations");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
    
    // Check for OAuth callback params
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const error = urlParams.get("error");
    
    if (success) {
      toast.success(`Successfully connected to ${success.replace("_", " ")}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/connections");
    }
    
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: "Missing OAuth parameters",
        invalid_state: "Invalid OAuth state",
        expired_state: "OAuth session expired. Please try again.",
        callback_failed: "Connection failed. Please try again.",
        access_denied: "Access was denied",
      };
      toast.error(errorMessages[error] || `Connection error: ${error}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/connections");
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [integrationsRes, apiKeysRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/api-keys"),
      ]);

      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data);
      }

      if (apiKeysRes.ok) {
        const data = await apiKeysRes.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type: IntegrationType) => {
    const config = INTEGRATION_TYPES[type];
    
    // Handle Telegram specially - uses bot token
    if (type === "telegram") {
      setTelegramDialogOpen(true);
      return;
    }
    
    if (config.oauthUrl) {
      // Get OAuth URL from API
      try {
        const response = await fetch(config.oauthUrl);
        const data = await response.json();
        
        if (data.error) {
          toast.error(data.error);
          return;
        }
        
        if (data.authUrl) {
          // Redirect to OAuth flow
          window.location.href = data.authUrl;
        }
      } catch (error) {
        console.error("Error initiating OAuth:", error);
        toast.error("Failed to connect. Please try again.");
      }
    } else {
      // Open configuration dialog
      setSelectedType(type);
      setConnectDialogOpen(true);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) return;

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      toast.success("Integration disconnected");
      loadData();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect integration");
    }
  };

  const handleToggleIntegration = async (integrationId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success(enabled ? "Integration enabled" : "Integration disabled");
      loadData();
    } catch (error) {
      console.error("Error updating integration:", error);
      toast.error("Failed to update integration");
    }
  };

  const handleCreateApiKey = async (name: string, scopes: string[]) => {
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes }),
      });

      if (!response.ok) throw new Error("Failed to create API key");

      const data = await response.json();
      setNewApiKey(data.key);
      toast.success("API key created");
      loadData();
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("API key deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-muted-foreground mt-2">
          Connect your favorite tools and automate your workflow
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="integrations">
            <Link2 className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6 mt-6">
          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Connected</h2>
              <div className="grid gap-4">
                {integrations.map((integration) => {
                  const config = INTEGRATION_TYPES[integration.type];
                  const Icon = config?.icon || Link2;

                  return (
                    <Card key={integration.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${config?.color || 'bg-gray-500'} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{integration.name}</h3>
                              <Badge variant={integration.enabled ? "default" : "secondary"}>
                                {integration.enabled ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {integration.description || config?.description}
                            </p>
                            {integration.lastUsedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last used: {new Date(integration.lastUsedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Switch
                            checked={integration.enabled}
                            onCheckedChange={(checked) =>
                              handleToggleIntegration(integration.id, checked)
                            }
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Activity className="h-4 w-4 mr-2" />
                                View Logs
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reconnect
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDisconnect(integration.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Disconnect
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Integrations */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {integrations.length > 0 ? "Available" : "All Integrations"}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(INTEGRATION_TYPES).map(([type, config]) => {
                const isConnected = integrations.some((i) => i.type === type);
                const Icon = config.icon;

                return (
                  <Card key={type} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-lg ${config.color} text-white`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        {isConnected && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-3">{config.name}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {config.features.map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        className="w-full"
                        variant={isConnected ? "outline" : "default"}
                        onClick={() => handleConnect(type as IntegrationType)}
                      >
                        {isConnected ? (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">API Keys</h2>
              <p className="text-sm text-muted-foreground">
                Manage your API keys for programmatic access
              </p>
            </div>
            <Button onClick={() => setApiKeyDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No API Keys</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create an API key to access our REST API programmatically
                </p>
                <Button onClick={() => setApiKeyDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First API Key
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apiKey.name}</h3>
                        <Badge variant={apiKey.enabled ? "default" : "secondary"}>
                          {apiKey.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {apiKey.prefix}••••••••••••
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.prefix + "...")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Rate: {apiKey.rateLimit}/hour</span>
                        <span>Used: {apiKey.requestCount} requests</span>
                        {apiKey.lastUsedAt && (
                          <span>
                            Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* API Documentation Link */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500 text-white">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">API Documentation</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn how to use our REST API
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <a href="/docs/api" target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Docs
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Outgoing Webhooks</h2>
              <p className="text-sm text-muted-foreground">
                Send real-time events to your external services
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Webhooks Configured</h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                Webhooks allow you to receive real-time notifications when events happen in your boards.
                Configure a webhook to get started.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Webhook
              </Button>
            </CardContent>
          </Card>

          {/* Event Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Events</CardTitle>
              <CardDescription>
                Events that can trigger webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  { event: "board.created", desc: "When a board is created" },
                  { event: "board.updated", desc: "When a board is updated" },
                  { event: "card.created", desc: "When a card is created" },
                  { event: "card.updated", desc: "When a card is updated" },
                  { event: "card.moved", desc: "When a card is moved" },
                  { event: "card.deleted", desc: "When a card is deleted" },
                  { event: "comment.created", desc: "When a comment is added" },
                  { event: "member.added", desc: "When a member is added" },
                ].map(({ event, desc }) => (
                  <div key={event} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <code className="text-xs bg-background px-2 py-1 rounded">
                      {event}
                    </code>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <CreateApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={setApiKeyDialogOpen}
        onSubmit={handleCreateApiKey}
        newApiKey={newApiKey}
        onNewApiKeyDismiss={() => setNewApiKey(null)}
      />

      {/* Telegram Bot Dialog */}
      <TelegramBotDialog
        open={telegramDialogOpen}
        onOpenChange={setTelegramDialogOpen}
        onSuccess={() => {
          loadData();
          setTelegramDialogOpen(false);
        }}
      />
    </div>
  );
}

// Create API Key Dialog Component
function CreateApiKeyDialog({
  open,
  onOpenChange,
  onSubmit,
  newApiKey,
  onNewApiKeyDismiss,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, scopes: string[]) => void;
  newApiKey: string | null;
  onNewApiKeyDismiss: () => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read", "write"]);
  const [showKey, setShowKey] = useState(false);
  const [creating, setCreating] = useState(false);

  const availableScopes = [
    { id: "read", label: "Read", desc: "Read boards, cards, and comments" },
    { id: "write", label: "Write", desc: "Create and update boards, cards" },
    { id: "delete", label: "Delete", desc: "Delete boards, cards, comments" },
    { id: "admin", label: "Admin", desc: "Full administrative access" },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setCreating(true);
    await onSubmit(name, scopes);
    setCreating(false);
  };

  const handleClose = () => {
    if (newApiKey) {
      onNewApiKeyDismiss();
    }
    setName("");
    setScopes(["read", "write"]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {newApiKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                API Key Created
              </DialogTitle>
              <DialogDescription>
                Make sure to copy your API key now. You won't be able to see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={newApiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(newApiKey);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access to your data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {availableScopes.map((scope) => (
                    <div
                      key={scope.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium text-sm">{scope.label}</p>
                        <p className="text-xs text-muted-foreground">{scope.desc}</p>
                      </div>
                      <Switch
                        checked={scopes.includes(scope.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setScopes([...scopes, scope.id]);
                          } else {
                            setScopes(scopes.filter((s) => s !== scope.id));
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Telegram Bot Dialog Component
function TelegramBotDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [botToken, setBotToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleConnect = async () => {
    if (!botToken.trim()) {
      toast.error("Please enter your bot token");
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch("/api/integrations/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to connect");
        return;
      }

      toast.success(`Bot @${data.integration.botUsername} connected!`);
      setBotToken("");
      onSuccess();
    } catch (error) {
      console.error("Error connecting bot:", error);
      toast.error("Failed to connect. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#0088cc]" />
            Connect Telegram Bot
          </DialogTitle>
          <DialogDescription>
            Create a bot with @BotFather on Telegram and paste the token here
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <div className="flex items-center gap-2">
              <Input
                id="botToken"
                type={showToken ? "text" : "password"}
                placeholder="123456789:ABCdefGHI..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get this from @BotFather after creating your bot
            </p>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium text-sm">How to create a Telegram bot:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Telegram and search for @BotFather</li>
              <li>Send /newbot and follow the instructions</li>
              <li>Copy the bot token provided</li>
              <li>Paste it above and click Connect</li>
            </ol>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
            <h4 className="font-medium text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Bot Features
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Send /newtask to create tasks from Telegram</li>
              <li>• Send /tasks to see your board tasks</li>
              <li>• Receive notifications on important events</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={connecting}
            className="bg-[#0088cc] hover:bg-[#006699]"
          >
            {connecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Connect Bot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
