import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { auth } from "@/lib/auth";

let io: SocketIOServer | null = null;

export type SocketEvent = 
  | "organization:created"
  | "organization:updated"
  | "organization:deleted"
  | "organization:member-added"
  | "organization:member-removed"
  | "organization:member-role-changed"
  | "organization:invitation-created"
  | "organization:invitation-accepted"
  | "organization:invitation-rejected"
  | "organization:invitation-cancelled"
  | "board:created"
  | "board:updated"
  | "board:deleted"
  | "board:member-added"
  | "board:member-removed"
  | "list:created"
  | "list:updated"
  | "list:deleted"
  | "list:moved"
  | "task:created"
  | "task:updated"
  | "task:deleted"
  | "task:moved"
  | "task:assigned"
  | "label:created"
  | "label:updated"
  | "label:deleted"
  | "task:label:added"
  | "task:label:removed"
  | "notification:new";

export interface SocketEventData {
  type: SocketEvent;
  data: any;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  boardId?: string;
}

export type SocketData<T = any> = {
  type: SocketEvent;
  data: T;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  boardId?: string;
};

export function initializeSocket(httpServer: HTTPServer) {
  if (io) {
    console.log("⚡ Socket.IO already initialized");
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", async (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Authentifier l'utilisateur
    const token = socket.handshake.auth.token;
    let userId: string | null = null;

    if (token) {
      try {
        // Vérifier le token avec Better Auth
        const session = await auth.api.getSession({
          headers: new Headers({
            cookie: `better-auth.session_token=${token}`,
          }),
        });

        if (session?.user) {
          userId = session.user.id;
          socket.data.userId = userId;
          console.log(`🔐 User authenticated: ${userId}`);
        }
      } catch (error) {
        console.error("❌ Auth error:", error);
      }
    }

    // Rejoindre les rooms de l'utilisateur
    socket.on("join:organization", (organizationId: string) => {
      socket.join(`org:${organizationId}`);
      console.log(`📍 User ${userId} joined organization: ${organizationId}`);
    });

    socket.on("leave:organization", (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
      console.log(`📍 User ${userId} left organization: ${organizationId}`);
    });

    socket.on("join:board", (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`📋 User ${userId} joined board: ${boardId}`);
    });

    socket.on("leave:board", (boardId: string) => {
      socket.leave(`board:${boardId}`);
      console.log(`📋 User ${userId} left board: ${boardId}`);
    });

    // Ping/pong pour vérifier la connexion
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} - ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  console.log("⚡ Socket.IO server initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
}

// Émettre un événement vers une organisation
export function emitToOrganization(
  organizationId: string,
  event: SocketEvent,
  data: any
) {
  if (!io) return;

  const eventData: SocketEventData = {
    type: event,
    data,
    timestamp: new Date(),
    organizationId,
  };

  io.to(`org:${organizationId}`).emit(event, eventData);
  console.log(`📡 Emitted ${event} to organization ${organizationId}`);
}

// Émettre un événement vers un board
export function emitToBoard(boardId: string, event: SocketEvent, data: any) {
  if (!io) {
    console.warn("⚠️ Socket.IO not initialized, cannot emit event");
    return;
  }

  const eventData: SocketEventData = {
    type: event,
    data,
    timestamp: new Date(),
    boardId,
  };

  // Vérifier combien de clients sont dans la room
  const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
  const clientCount = room ? room.size : 0;
  
  console.log(`📡 Emitting ${event} to board ${boardId} (${clientCount} clients in room)`);
  
  if (clientCount === 0) {
    console.warn(`⚠️ No clients in room board:${boardId}`);
  }

  io.to(`board:${boardId}`).emit(event, eventData);
}

// Émettre un événement vers un utilisateur spécifique
export function emitToUser(userId: string, event: SocketEvent, data: any) {
  if (!io) return;

  const eventData: SocketEventData = {
    type: event,
    data,
    timestamp: new Date(),
    userId,
  };

  // Trouver le socket de l'utilisateur
  const sockets = io.sockets.sockets;
  sockets.forEach((socket) => {
    if (socket.data.userId === userId) {
      socket.emit(event, eventData);
      console.log(`📡 Emitted ${event} to user ${userId}`);
    }
  });
}

// Broadcast global (à tous les clients connectés)
export function broadcast(event: SocketEvent, data: any) {
  if (!io) return;

  const eventData: SocketEventData = {
    type: event,
    data,
    timestamp: new Date(),
  };

  io.emit(event, eventData);
  console.log(`📡 Broadcasted ${event}`);
}
