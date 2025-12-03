"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { SocketEvent, SocketData } from "@/lib/socket";

interface UseSocketOptions {
  organizationId?: string;
  boardId?: string;
  enabled?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { organizationId, boardId, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!enabled) {
      console.log('🔌 Socket.IO disabled');
      return;
    }

    // Récupérer le token d'authentification
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("better-auth.session_token="))
      ?.split("=")[1];

    if (!token) {
      console.warn("⚠️ No authentication token found in cookies");
      setError(new Error("No authentication token found"));
      // Continuer quand même sans token pour tester
    }

    // Créer la connexion Socket.IO
    const socketUrl = typeof window !== "undefined" 
      ? `${window.location.protocol}//${window.location.host}`
      : "http://localhost:3000";
    
    console.log(`🔌 Connecting to Socket.IO server at: ${socketUrl}`);
    console.log(`🔑 Auth token: ${token ? 'Found ✅' : 'Missing ❌'}`);
    
    const socket = io(socketUrl, {
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    socketRef.current = socket;

    // Event handlers
    socket.on("connect", () => {
      console.log("✅ Socket.IO connected");
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Rejoindre les rooms appropriées
      if (organizationId) {
        socket.emit("join:organization", organizationId);
        console.log(`📍 Joined organization room: ${organizationId}`);
      }
      if (boardId) {
        socket.emit("join:board", boardId);
        console.log(`� Joined board room: ${boardId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket.IO disconnected:", reason);
      setIsConnected(false);
      
      if (reason === "io server disconnect") {
        // Le serveur a déconnecté, il faut reconnecter manuellement
        socket.connect();
      }
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket.IO connection error:", err);
      setError(err);
      reconnectAttemptsRef.current++;

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError(new Error("Max reconnection attempts reached"));
        socket.disconnect();
      }
    });

    socket.on("pong", (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      console.log(`🏓 Pong received (latency: ${latency}ms)`);
    });

    // Cleanup
    return () => {
      if (organizationId) {
        socket.emit("leave:organization", organizationId);
      }
      if (boardId) {
        socket.emit("leave:board", boardId);
      }
      socket.disconnect();
    };
  }, [enabled, organizationId, boardId]);

  // Rejoindre les rooms quand les IDs changent (pour les connexions déjà établies)
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    if (boardId) {
      console.log(`🔄 Attempting to join board room: ${boardId}`);
      socketRef.current.emit("join:board", boardId);
      console.log(`📋 Rejoined board room: ${boardId}`);
    }

    if (organizationId) {
      console.log(`🔄 Attempting to join organization room: ${organizationId}`);
      socketRef.current.emit("join:organization", organizationId);
      console.log(`📍 Rejoined organization room: ${organizationId}`);
    }
  }, [boardId, organizationId, isConnected]);

  // Fonction pour écouter des événements
  const on = <T = any>(event: SocketEvent, callback: (data: SocketData<T>) => void) => {
    if (!socketRef.current) {
      console.warn(`⚠️ Cannot listen to ${event}: Socket not initialized`);
      return;
    }
    console.log(`👂 Listening to event: ${event}`);
    
    // Wrapper pour logger quand l'événement est reçu
    const wrappedCallback = (data: SocketData<T>) => {
      console.log(`📥 Event received: ${event}`, data);
      callback(data);
    };
    
    socketRef.current.on(event, wrappedCallback);
  };

  // Fonction pour arrêter d'écouter des événements
  const off = (event: SocketEvent, callback?: (...args: any[]) => void) => {
    if (!socketRef.current) return;
    if (callback) {
      socketRef.current.off(event, callback);
    } else {
      socketRef.current.off(event);
    }
  };

  // Fonction pour émettre des événements
  const emit = (event: SocketEvent, data: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    on,
    off,
    emit,
  };
}
