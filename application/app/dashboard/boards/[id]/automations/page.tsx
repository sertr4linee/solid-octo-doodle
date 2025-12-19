"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Zap, LayoutTemplate, Webhook } from "lucide-react";
import {
  AutomationList,
  TemplateGallery,
  WebhookManager,
} from "@/components/automations";
import type { AutomationTemplate } from "@/components/automations/types";

interface BoardData {
  id: string;
  name: string;
  lists: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  members: { id: string; name: string; image?: string }[];
}

export default function BoardAutomationsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchBoard() {
      try {
        const response = await fetch(`/api/boards/${boardId}`);
        if (response.ok) {
          const data = await response.json();
          setBoard({
            id: data.id,
            name: data.name,
            lists: data.lists?.map((l: any) => ({ id: l.id, name: l.name })) || [],
            labels: data.labels?.map((l: any) => ({ id: l.id, name: l.name, color: l.color })) || [],
            members: data.members?.map((m: any) => ({
              id: m.user?.id || m.id,
              name: m.user?.name || m.name || "Membre",
              image: m.user?.image || m.image,
            })) || [],
          });
        }
      } catch (error) {
        console.error("Error fetching board:", error);
      } finally {
        setLoading(false);
      }
    }

    if (boardId) {
      fetchBoard();
    }
  }, [boardId]);

  const handleTemplateSelect = async (template: AutomationTemplate) => {
    // Créer la règle à partir du template
    try {
      const response = await fetch(`/api/boards/${boardId}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          triggerType: template.triggerType,
          triggerConfig: template.triggerConfig,
          conditions: template.conditions,
          actions: template.actions,
          enabled: true,
        }),
      });

      if (response.ok) {
        setShowTemplates(false);
        setRefreshKey((k) => k + 1); // Refresh the list
      }
    } catch (error) {
      console.error("Error creating rule from template:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/boards/${boardId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Automations
          </h1>
          <p className="text-muted-foreground">
            {board?.name || "Board"} - Gérez les règles d&apos;automatisation
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Règles
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <AutomationList
            key={refreshKey}
            boardId={boardId}
            lists={board?.lists || []}
            labels={board?.labels || []}
            members={board?.members || []}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="text-center py-8">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              Templates d&apos;automatisation
            </h3>
            <p className="text-muted-foreground mb-4">
              Utilisez des templates prédéfinis pour créer rapidement des règles
            </p>
            <Button onClick={() => setShowTemplates(true)}>
              Parcourir les templates
            </Button>
          </div>
          
          <TemplateGallery
            open={showTemplates}
            onClose={() => setShowTemplates(false)}
            onSelect={handleTemplateSelect}
          />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <WebhookManager boardId={boardId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
