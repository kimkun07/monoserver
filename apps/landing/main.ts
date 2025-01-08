import express from "express";
import path from "path";
import { readFileSync } from "fs";

class SignalServer {
  private app: express.Application;
  private port: number;
  private signalCount: number;
  private clients: express.Response[];

  constructor(port: number) {
    this.app = express();
    this.port = port;
    this.signalCount = 0;
    this.clients = [];

    this.serve_index_html();
    this.serve_static();

    this.open_SSE_to_clients();
    this.get_signal_from_host();
  }

  private serve_index_html() {
    const template = readFileSync(
      path.join(__dirname, "public/index.html"),
      "utf-8",
    );

    this.app.get("/", (req, res) => {
      const html = template.replace(
        "{{signalCount}}",
        this.signalCount.toString(),
      );
      res.send(html);
    });
  }

  private serve_static() {
    this.app.use(express.static(path.join(__dirname, "public")));
  }

  private open_SSE_to_clients() {
    this.app.get("/events", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Start connection
      this.clients.push(res);

      // Close connection
      req.on("close", () => {
        this.clients = this.clients.filter((client) => client !== res);
      });
    });
  }

  private send_SSE_to_clients() {
    // Notify all clients
    this.clients.forEach((client) => {
      client.write(`data: ${this.signalCount}\n\n`);
    });
  }

  private get_signal_from_host() {
    // Signal handler for current node.js process
    process.on("SIGUSR2", () => {
      console.log("SIGUSR2 signal received");
      this.signalCount++;

      this.send_SSE_to_clients();
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`Server is running at http://localhost:${this.port}`);
      if (process.pid) {
        console.log("Process ID:", process.pid);
      }
    });
  }
}

new SignalServer(3000).start();
new SignalServer(5000).start();
