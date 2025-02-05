import { getPreferenceValues, showToast, Toast, AI } from "@raycast/api";
import http from "http";

interface Preferences {
  port: number;
}

export default async function Command() {
  const { port } = getPreferenceValues<Preferences>();

  // Start an HTTP server
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Only POST method is allowed" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const requestData = JSON.parse(body);
        const prompt = requestData.prompt;
        if (!prompt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing 'prompt' in request body" }));
          return;
        }

        // Call AI.ask with the provided prompt.
        const answer = await AI.ask(prompt);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ answer }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
