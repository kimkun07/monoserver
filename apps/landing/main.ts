import express from "express";

if (process.pid) {
  console.log("Node process is pid " + process.pid);
}

const app = express();
const port = 3000;
let signal_count = 0;
let clients: express.Response[] = [];

app.get("/", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f5f5f5;
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-top: 2rem;
        }
        h1 { color: #333; }
        #signal-count {
            font-size: 2rem;
            font-weight: bold;
            color: #2563eb;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Welcome to Landing Page</h1>
        <p>Current signal count: <span id="signal-count">${signal_count}</span></p>
    </div>
    <script>
        const evtSource = new EventSource("/events");
        const signalCountElement = document.getElementById("signal-count");
        
        evtSource.onmessage = (event) => {
            signalCountElement.textContent = event.data;
            // Add a subtle animation
            signalCountElement.style.transform = 'scale(1.2)';
            setTimeout(() => {
                signalCountElement.style.transform = 'scale(1)';
            }, 200);
        };

        evtSource.onerror = () => {
            console.log("EventSource failed");
        };
    </script>
</body>
</html>
  `;
  res.send(html);
});

// SSE endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

process.on("SIGUSR2", () => {
  console.log("SIGUSR2 signal received by node");
  signal_count++;

  clients.forEach((client) => {
    client.write(`data: ${signal_count}\n\n`);
  });
});
