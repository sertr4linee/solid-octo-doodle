"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  ArrowRight,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface BoardWithAutomations {
  id: string;
  name: string;
  automationCount: number;
  enabledCount: number;
  lastExecuted?: string;
}

export default function AutomationsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardWithAutomations[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRules: 0,
    enabledRules: 0,
    executionsToday: 0,
    successRate: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch boards
        const boardsRes = await fetch("/api/boards");
        if (boardsRes.ok) {
          const boardsData = await boardsRes.json();

          // Fetch automations for each board
          const boardsWithAutomations = await Promise.all(
            boardsData.map(async (board: any) => {
              try {
                const automationsRes = await fetch(
                  `/api/boards/${board.id}/automations`
                );
                if (automationsRes.ok) {
                  const automations = await automationsRes.json();
                  return {
                    id: board.id,
                    name: board.name,
                    automationCount: automations.length,
                    enabledCount: automations.filter((a: any) => a.enabled)
                      .length,
                  };
                }
              } catch {
                // Ignore errors for individual boards
              }
              return {
                id: board.id,
                name: board.name,
                automationCount: 0,
                enabledCount: 0,
              };
            })
          );

          setBoards(boardsWithAutomations);

          // Calculate stats
          const totalRules = boardsWithAutomations.reduce(
            (sum, b) => sum + b.automationCount,
            0
          );
          const enabledRules = boardsWithAutomations.reduce(
            (sum, b) => sum + b.enabledCount,
            0
          );

          setStats({
            totalRules,
            enabledRules,
            executionsToday: 0, // Would need a separate API call
            successRate: 95, // Placeholder
          });
        }
      } catch (error) {
        console.error("Error fetching automations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Automations
        </h1>
        <p className="text-muted-foreground">
          Gérez les règles d&apos;automatisation de tous vos tableaux
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total règles</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actives</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.enabledRules}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Exécutions (24h)
                </p>
                <p className="text-2xl font-bold">{stats.executionsToday}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de succès</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boards List */}
      <Card>
        <CardHeader>
          <CardTitle>Automations par tableau</CardTitle>
          <CardDescription>
            Sélectionnez un tableau pour gérer ses règles d&apos;automatisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {boards.length === 0 ? (
            <div className="text-center py-8">
              <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Aucun tableau</h3>
              <p className="text-muted-foreground mb-4">
                Créez un tableau pour commencer à utiliser les automatisations
              </p>
              <Button asChild>
                <Link href="/dashboard/boards">Voir les tableaux</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/dashboard/boards/${board.id}/automations`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                      <LayoutDashboard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{board.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {board.automationCount} règle
                        {board.automationCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {board.enabledCount > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-600 border-green-500/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {board.enabledCount} active
                        {board.enabledCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {board.automationCount > 0 &&
                      board.enabledCount < board.automationCount && (
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          {board.automationCount - board.enabledCount} inactive
                          {board.automationCount - board.enabledCount !== 1
                            ? "s"
                            : ""}
                        </Badge>
                      )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Conseils rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 text-yellow-500" />
              <span>
                <strong>Évitez les boucles</strong> : Ne créez pas de règles qui
                peuvent se déclencher mutuellement
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-blue-500" />
              <span>
                <strong>Utilisez des délais</strong> : Ajoutez un délai pour
                éviter les exécutions trop rapides
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
              <span>
                <strong>Testez avant d&apos;activer</strong> : Utilisez la
                fonction de test pour vérifier vos règles
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
