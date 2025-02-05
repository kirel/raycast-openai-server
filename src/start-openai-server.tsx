import { getPreferenceValues, showToast, Toast, AI } from "@raycast/api";
import http from "http";

interface Preferences {
  port: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  console.log("Read preferences:", JSON.stringify(preferences));
  const { port } = preferences;
  console.log("Read port from preferences:", port);
  const portNumber = Number(port);
  if (Number.isNaN(portNumber)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Port",
      message: "The port is invalid. Please set a valid number in the preferences."
    });
    return;
  }

  // Start an HTTP server
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Endpoint not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const requestData = JSON.parse(body);
        if (!requestData.messages || !Array.isArray(requestData.messages)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing or invalid 'messages' in request body" }));
          return;
        }

        const lastMessage = requestData.messages[requestData.messages.length - 1];
        const prompt = lastMessage.content;
        if (!prompt) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing 'content' in the last message" }));
          return;
        }

        // Call AI.ask with the prompt and stream the response.
        const answer = AI.ask(prompt);

        // Set headers for a streaming response (using Server-Sent Events).
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        // When data is available, send it as a streaming chunk.
        answer.on("data", (data: Buffer | string) => {
          res.write("data: " + JSON.stringify({ choices: [{ delta: { content: data.toString() } }] }) + "\n\n");
        });

        // On stream end, signal completion.
        answer.on("end", () => {
          res.write("data: [DONE]\n\n");
          res.end();
        });

        // Handle stream errors.
        answer.on("error", (err: any) => {
          res.write("data: " + JSON.stringify({ error: err.message }) + "\n\n");
          res.end();
        });
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(portNumber, () => {
    console.log(`Server is listening on port ${portNumber}`);
  });

  // Listen for the 'close' event and print a message when the server shuts down.
  server.on("close", () => {
    console.log("Server has been shut down.");
  });

  await new Promise(() => {});
}
