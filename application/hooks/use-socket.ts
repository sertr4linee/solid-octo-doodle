"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { SocketEvent, SocketData } from "@/lib/socket";

const isDev = process.env.NODE_ENV !== "production";

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
  const currentRoomsRef = useRef<{ orgId?: string; boardId?: string }>({});

  useEffect(() => {
    if (!enabled) return;

    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("better-auth.session_token="))
      ?.split("=")[1];

    if (!token) {
      setError(new Error("No authentication token found"));
    }

    const socketUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "http://localhost:3000";

    const socket = io(socketUrl, {
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      isDev && console.log("✅ Socket connected");
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;

      if (organizationId) {
        socket.emit("join:organization", organizationId);
        currentRoomsRef.current.orgId = organizationId;
      }
      if (boardId) {
        socket.emit("join:board", boardId);
        currentRoomsRef.current.boardId = boardId;
      }
    });

    socket.on("disconnect", (reason) => {
      isDev && console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", (err) => {
      setError(err);
      reconnectAttemptsRef.current++;

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError(new Error("Max reconnection attempts reached"));
        socket.disconnect();
      }
    });

    return () => {
      if (currentRoomsRef.current.orgId) {
        socket.emit("leave:organization", currentRoomsRef.current.orgId);
      }
      if (currentRoomsRef.current.boardId) {
        socket.emit("leave:board", currentRoomsRef.current.boardId);
      }
      socket.disconnect();
    };
  }, [enabled]);

  // Handle room changes when IDs change
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    const socket = socketRef.current;

    // Handle board room changes
    if (boardId !== currentRoomsRef.current.boardId) {
      if (currentRoomsRef.current.boardId) {
        socket.emit("leave:board", currentRoomsRef.current.boardId);
      }
      if (boardId) {
        socket.emit("join:board", boardId);
      }
      currentRoomsRef.current.boardId = boardId;
    }

    // Handle org room changes
    if (organizationId !== currentRoomsRef.current.orgId) {
      if (currentRoomsRef.current.orgId) {
        socket.emit("leave:organization", currentRoomsRef.current.orgId);
      }
      if (organizationId) {
        socket.emit("join:organization", organizationId);
      }
      currentRoomsRef.current.orgId = organizationId;
    }
  }, [boardId, organizationId, isConnected]);

  // Fonction pour écouter des événements
  const on = <T = any>(event: SocketEvent, callback: (data: SocketData<T>) => void) => {
    if (!socketRef.current) {
      console.warn(`⚠️ Cannot listen to ${event}: Socket not initialized`);
      return;
    }
    socketRef.current.on(event, callback);
  };

  // Fonction pour arrêter d'écouter des événements
  const off = (event: SocketEvent, callback?: (...args: any[]) => void) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, callback);
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
