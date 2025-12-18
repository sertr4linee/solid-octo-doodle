"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Send,
  Github,
  FileText,
  Loader2,
  RefreshCw,
  Settings,
  MessageSquare,
  Bell,
  ListTodo,
  Link2,
  Code,
  Zap,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Terminal,
  Copy,
  ExternalLink,
  Trash2,
  ChevronRight,
} from "lucide-react";

interface Integration {
  id: string;
  type: string;
  name: string;
  description?: string;
  enabled: boolean;
  config: string;
  accessToken?: string;
  organizationId?: string;
  boardId?: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface IntegrationLog {
  id: string;
  action: string;
  status: string;
  message?: string;
  metadata?: string;
  createdAt: string;
}

interface Board {
  id: string;
  name: string;
}

// Integration capabilities
const INTEGRATION_CAPABILITIES = {
  telegram: {
    name: "Telegram Bot",
    icon: Send,
    color: "bg-[#0088cc]",
    description: "Interact with your boards via Telegram",
    features: [
      {
        id: "notifications",
        name: "Notifications",
        description: "Receive notifications when tasks are created, updated, or completed",
        icon: Bell,
        available: true,
      },
      {
        id: "create_tasks",
        name: "Create Tasks",
        description: "Create new tasks by sending /newtask command",
        icon: ListTodo,
        available: true,
      },
      {
        id: "view_tasks",
        name: "View Tasks",
        description: "List tasks with /tasks command",
        icon: ListTodo,
        available: true,
      },
      {
        id: "chat_commands",
        name: "Chat Commands",
        description: "Use bot commands directly in Telegram",
        icon: Terminal,
        available: true,
      },
    ],
    commands: [
      { command: "/start", description: "Initialize the bot and see available commands" },
      { command: "/newtask [title]", description: "Create a new task in the linked board" },
      { command: "/tasks", description: "View current tasks from the linked board" },
      { command: "/help", description: "Show help message with all commands" },
    ],
  },
  github: {
    name: "GitHub",
    icon: Github,
    color: "bg-[#24292e]",
    description: "Link GitHub issues and PRs to your tasks",
    features: [
      {
        id: "link_issues",
        name: "Link Issues",
        description: "Attach GitHub issues to tasks for tracking",
        icon: Link2,
        available: true,
      },
      {
        id: "link_prs",
        name: "Link Pull Requests",
        description: "Connect PRs to tasks and track their status",
        icon: Code,
        available: true,
      },
      {
        id: "auto_sync",
        name: "Auto Sync",
        description: "Automatically update task status based on PR/issue state",
        icon: RefreshCw,
        available: true,
      },
      {
        id: "webhooks",
        name: "Webhooks",
        description: "Receive real-time updates from GitHub",
        icon: Zap,
        available: true,
      },
    ],
    commands: [],
  },
  google_drive: {
    name: "Google Drive",
    icon: FileText,
    color: "bg-[#4285F4]",
    description: "Attach and preview Google Drive files",
    features: [
      {
        id: "attach_files",
        name: "Attach Files",
        description: "Add Google Drive files as attachments to tasks",
        icon: FileText,
        available: true,
      },
      {
        id: "preview",
        name: "File Preview",
        description: "Preview documents directly in the app",
        icon: ExternalLink,
        available: true,
      },
      {
        id: "sync",
        name: "Sync Changes",
        description: "Keep attachments in sync with Drive updates",
        icon: RefreshCw,
        available: true,
      },
    ],
    commands: [],
  },
};

type IntegrationType = keyof typeof INTEGRATION_CAPABILITIES;

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testChatId, setTestChatId] = useState("");
  const [sending, setSending] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedIntegration) {
      loadLogs(selectedIntegration.id);
    }
  }, [selectedIntegration]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [integrationsRes, boardsRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/boards"),
      ]);

      if (integrationsRes.ok) {
        const data = await integrationsRes.json();
        setIntegrations(data);
        // Auto-select first integration
        if (data.length > 0 && !selectedIntegration) {
          setSelectedIntegration(data[0]);
        }
      }

      if (boardsRes.ok) {
        const data = await boardsRes.json();
        setBoards(data.boards || data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (integrationId: string) => {
    try {
      setLogsLoading(true);
      const response = await fetch(`/api/integrations/${integrationId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!selectedIntegration || !testMessage || !testChatId) {
      toast.error("Please fill all fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/integrations/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: selectedIntegration.id,
          chatId: parseInt(testChatId),
          message: testMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      toast.success("Message sent successfully!");
      setTestDialogOpen(false);
      setTestMessage("");
      loadLogs(selectedIntegration.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedIntegration) return;

    try {
      const response = await fetch(`/api/integrations/${selectedIntegration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: selectedBoardId || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update configuration");
      }

      toast.success("Configuration updated!");
      setConfigDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update configuration");
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return;

    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete integration");
      }

      toast.success("Integration deleted");
      setSelectedIntegration(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete integration");
    }
  };

  const handlePollMessages = async () => {
    if (!selectedIntegration) return;

    setPolling(true);
    try {
      const response = await fetch("/api/integrations/telegram/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: selectedIntegration.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to poll messages");
      }

      if (data.messagesProcessed > 0) {
        toast.success(`Processed ${data.messagesProcessed} message(s)!`);
      } else if (data.updatesReceived > 0) {
        toast.info(`Received ${data.updatesReceived} update(s), no commands to process`);
      } else {
        toast.info("No new messages");
      }
      
      loadLogs(selectedIntegration.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to poll messages");
    } finally {
      setPolling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Link2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Integrations Connected</h2>
          <p className="text-muted-foreground mb-6">
            Connect your first integration to unlock powerful automation features
          </p>
          <Button onClick={() => window.location.href = "/dashboard/connections"}>
            <Zap className="h-4 w-4 mr-2" />
            Go to Connections
          </Button>
        </div>
      </div>
    );
  }

  const capabilities = selectedIntegration 
    ? INTEGRATION_CAPABILITIES[selectedIntegration.type as IntegrationType]
    : null;

  const integrationConfig = selectedIntegration 
    ? (() => {
        try {
          const config = selectedIntegration.config;
          if (!config) return {};
          if (typeof config === "object") return config;
          return JSON.parse(config);
        } catch {
          return {};
        }
      })()
    : {};

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Manage and configure your connected integrations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Integration List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-2">Connected</h3>
          {integrations.map((integration) => {
            const config = INTEGRATION_CAPABILITIES[integration.type as IntegrationType];
            const Icon = config?.icon || Link2;
            const isSelected = selectedIntegration?.id === integration.id;

            return (
              <button
                key={integration.id}
                onClick={() => setSelectedIntegration(integration)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                  isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                }`}
              >
                <div className={`p-2 rounded-lg ${config?.color || "bg-gray-500"} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{integration.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {config?.name || integration.type}
                  </p>
                </div>
                {isSelected && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            );
          })}

          <Separator className="my-4" />

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/dashboard/connections"}
          >
            <Zap className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {selectedIntegration && capabilities && (
            <>
              {/* Integration Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-xl ${capabilities.color} text-white`}>
                        <capabilities.icon className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{selectedIntegration.name}</h2>
                        <p className="text-muted-foreground">{capabilities.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={selectedIntegration.enabled ? "default" : "secondary"}>
                            {selectedIntegration.enabled ? "Active" : "Disabled"}
                          </Badge>
                          {selectedIntegration.boardId && (
                            <Badge variant="outline">
                              Linked to board
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBoardId(selectedIntegration.boardId || "");
                          setConfigDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteIntegration(selectedIntegration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="features">
                <TabsList>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  {selectedIntegration.type === "telegram" && (
                    <TabsTrigger value="commands">Commands</TabsTrigger>
                  )}
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                  <TabsTrigger value="logs">Activity Logs</TabsTrigger>
                </TabsList>

                {/* Features Tab */}
                <TabsContent value="features" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {capabilities.features.map((feature) => (
                      <Card key={feature.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <feature.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{feature.name}</h4>
                                {feature.available ? (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Commands Tab (Telegram) */}
                {selectedIntegration.type === "telegram" && (
                  <TabsContent value="commands" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Bot Commands</CardTitle>
                        <CardDescription>
                          Available commands for your Telegram bot
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {capabilities.commands.map((cmd, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <code className="px-2 py-1 rounded bg-background font-mono text-sm">
                                  {cmd.command}
                                </code>
                                <span className="text-sm text-muted-foreground">
                                  {cmd.description}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(cmd.command)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {integrationConfig.botUsername && (
                          <div className="mt-6 p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                            <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                              How to use
                            </h4>
                            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                              <li>
                                Open Telegram and search for{" "}
                                <code className="px-1 py-0.5 rounded bg-background">
                                  @{integrationConfig.botUsername}
                                </code>
                              </li>
                              <li>Start a conversation with /start</li>
                              <li>Use the commands above to interact with your board</li>
                            </ol>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Actions Tab */}
                <TabsContent value="actions" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedIntegration.type === "telegram" && (
                      <>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setTestDialogOpen(true)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <MessageSquare className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Send Test Message</h4>
                                <p className="text-sm text-muted-foreground">
                                  Send a message via the bot
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={handlePollMessages}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                {polling ? (
                                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium">Poll Messages</h4>
                                <p className="text-sm text-muted-foreground">
                                  Check for new messages and process commands
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="md:col-span-2 border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-yellow-700 dark:text-yellow-400">Development Mode</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  En développement local, les webhooks Telegram ne fonctionnent pas (HTTPS requis).
                                  Utilisez le bouton "Poll Messages" pour récupérer et traiter les messages de votre bot.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                    {selectedIntegration.type === "github" && (
                      <>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <Link2 className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Link Repository</h4>
                                <p className="text-sm text-muted-foreground">
                                  Connect a GitHub repository
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                <Zap className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Setup Webhook</h4>
                                <p className="text-sm text-muted-foreground">
                                  Configure GitHub webhooks
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Logs Tab */}
                <TabsContent value="logs" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Activity Logs</CardTitle>
                        <CardDescription>
                          Recent activity from this integration
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadLogs(selectedIntegration.id)}
                        disabled={logsLoading}
                      >
                        {logsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No activity logs yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                            >
                              {getStatusIcon(log.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{log.action}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {log.status}
                                  </Badge>
                                </div>
                                {log.message && (
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {log.message}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(log.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Test Message Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Message</DialogTitle>
            <DialogDescription>
              Send a message through your Telegram bot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chatId">Chat ID</Label>
              <Input
                id="chatId"
                placeholder="e.g., 123456789"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Start a chat with the bot and send /start to get your chat ID
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTestMessage} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Integration</DialogTitle>
            <DialogDescription>
              Update the integration settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Linked Board</Label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a board (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No board linked</SelectItem>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this integration to a specific board to enable task creation
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateConfig}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
