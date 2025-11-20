import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialiser Socket.IO
  initializeSocket(httpServer);

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`
        ╔════════════════════════════════════════════╗
        ║                                            ║
        ║   🚀 Server ready                          ║
        ║   📍 http://${hostname}:${port}${" ".repeat(Math.max(0, 16 - hostname.length - port.toString().length))}║
        ║   ⚡ Socket.IO enabled                     ║
        ║                                            ║
        ╚════════════════════════════════════════════╝
      `);
    });
});
