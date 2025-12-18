"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AutomationLog } from "./types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AutomationLogsProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  ruleId: string;
}

export function AutomationLogs({
  open,
  onClose,
  boardId,
  ruleId,
}: AutomationLogsProps) {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, ruleId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/automations/${ruleId}/logs?limit=50`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "skipped":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Succès";
      case "failed":
        return "Échec";
      case "running":
        return "En cours";
      case "skipped":
        return "Ignoré";
      case "pending":
        return "En attente";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Historique d'exécution</DialogTitle>
          <DialogDescription>
            Les 50 dernières exécutions de cette automatisation
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune exécution enregistrée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    log.status === "failed" && "border-red-200 bg-red-50 dark:bg-red-950/20",
                    log.status === "success" && "border-green-200 bg-green-50 dark:bg-green-950/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(log.status)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.triggerEvent}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.startedAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>

                        {log.actionsExecuted && log.actionsExecuted.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {log.actionsExecuted.length} action(s) exécutée(s)
                          </div>
                        )}

                        {log.error && (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            {log.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          log.status === "success"
                            ? "default"
                            : log.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {getStatusLabel(log.status)}
                      </Badge>
                      {log.duration && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.duration}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {log.actionsExecuted && log.actionsExecuted.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Voir les détails
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.actionsExecuted, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
