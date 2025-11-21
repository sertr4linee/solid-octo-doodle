"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SocketDebugProps {
  isConnected: boolean;
  boardId?: string;
  organizationId?: string;
}

export function SocketDebug({ isConnected, boardId, organizationId }: SocketDebugProps) {
  const [events, setEvents] = useState<Array<{ time: string; event: string; data: any }>>([]);

  useEffect(() => {
    // Écouter tous les événements Socket.IO dans la console
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog(...args);
      
      // Capturer les logs Socket.IO
      const message = args.join(" ");
      if (message.includes("📡") || message.includes("✅") || message.includes("❌")) {
        setEvents((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            event: message,
            data: args[1] || {},
          },
          ...prev.slice(0, 9), // Garder seulement les 10 derniers
        ]);
      }
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  // Ne pas afficher en production
  if (process.env.NODE_ENV === "production") return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto z-50 shadow-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Socket.IO Debug</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs space-y-1">
          {boardId && (
            <div>
              <span className="font-semibold">Board:</span> {boardId}
            </div>
          )}
          {organizationId && (
            <div>
              <span className="font-semibold">Organization:</span> {organizationId}
            </div>
          )}
        </div>
        
        <div className="space-y-1 mt-3">
          <div className="text-xs font-semibold text-muted-foreground">Recent Events:</div>
          {events.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No events yet</div>
          ) : (
            events.map((event, i) => (
              <div key={i} className="text-xs p-2 bg-muted rounded">
                <div className="font-mono text-[10px] text-muted-foreground">{event.time}</div>
                <div className="font-medium">{event.event}</div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
