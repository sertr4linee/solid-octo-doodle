import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { auth } from "@/lib/auth";

let io: SocketIOServer | null = null;
const isDev = process.env.NODE_ENV !== "production";

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
  | "task:reaction:added"
  | "task:reaction:removed"
  | "checklist:created"
  | "checklist:updated"
  | "checklist:deleted"
  | "checklist:item:created"
  | "checklist:item:updated"
  | "checklist:item:deleted"
  | "checklist:item:checked"
  | "notification:new";

export type SocketData<T = any> = {
  type: SocketEvent;
  data: T;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  boardId?: string;
};

// Backward compatibility alias
export type SocketEventData = SocketData;

export function initializeSocket(httpServer: HTTPServer) {
  if (io) {
    isDev && console.log("⚡ Socket.IO already initialized");
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      isDev && console.warn(`⚠️ No auth token for socket ${socket.id}`);
      return next();
    }

    try {
      const session = await auth.api.getSession({
        headers: new Headers({
          cookie: `better-auth.session_token=${token}`,
        }),
      });

      if (session?.user) {
        socket.data.userId = session.user.id;
        socket.data.userName = session.user.name;
        isDev && console.log(`🔐 User authenticated: ${session.user.name}`);
        next();
      } else {
        isDev && console.warn(`⚠️ Invalid session for socket ${socket.id}`);
        next();
      }
    } catch (error) {
      console.error("Auth middleware error:", error);
      next();
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    const userName = socket.data.userName || "Anonymous";
    isDev && console.log(`✅ Connected: ${userName}`);

    // Auto-join user room for direct messages
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("join:organization", (organizationId: string) => {
      socket.join(`org:${organizationId}`);
    });

    socket.on("leave:organization", (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
    });

    socket.on("join:board", (boardId: string) => {
      const room = `board:${boardId}`;
      if (!socket.rooms.has(room)) {
        socket.join(room);
      }
    });

    socket.on("leave:board", (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      isDev && console.log(`❌ Disconnected: ${userName} - ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error:`, error);
    });
  });

  isDev && console.log("⚡ Socket.IO server initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
}

export function emitToOrganization(
  organizationId: string,
  event: SocketEvent,
  data: any
) {
  if (!io) return;

  const eventData: SocketData = {
    type: event,
    data,
    timestamp: new Date(),
    organizationId,
  };

  io.to(`org:${organizationId}`).emit(event, eventData);
}

export function emitToBoard(boardId: string, event: SocketEvent, data: any) {
  if (!io) return;

  const eventData: SocketData = {
    type: event,
    data,
    timestamp: new Date(),
    boardId,
  };

  io.to(`board:${boardId}`).emit(event, eventData);
}

export function emitToUser(userId: string, event: SocketEvent, data: any) {
  if (!io) return;

  const eventData: SocketData = {
    type: event,
    data,
    timestamp: new Date(),
    userId,
  };

  // Use user room for efficient targeting
  io.to(`user:${userId}`).emit(event, eventData);
}

export function broadcast(event: SocketEvent, data: any) {
  if (!io) return;

  const eventData: SocketData = {
    type: event,
    data,
    timestamp: new Date(),
  };

  io.emit(event, eventData);
}
