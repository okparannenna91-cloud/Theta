import "../scripts/env-loader.mjs";
import http from "node:http";
import { POST as chatPOST } from "../app/api/flow/chat/route";
import { GET as modelsGET } from "../app/api/flow/models/route";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    let bodyText = "";
    for await (const chunk of req) bodyText += chunk;

    let handlerRes: Response;
    if (url.pathname === "/api/flow/models" && req.method === "GET") {
      handlerRes = await modelsGET(new Request(url.toString(), { method: "GET", headers: req.headers as any }));
    } else if (url.pathname === "/api/flow/chat" && req.method === "POST") {
      handlerRes = await chatPOST(
        new Request(url.toString(), {
          method: "POST",
          headers: req.headers as any,
          body: bodyText,
        })
      );
    } else {
      handlerRes = new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "content-type": "application/json" } });
    }

    res.writeHead(handlerRes.status, Object.fromEntries(handlerRes.headers.entries()));
    const body = await handlerRes.text();
    res.end(body);
  } catch (err: any) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: err?.message ?? String(err) }));
  }
});

const port = 3100;
server.listen(port, () => {
  console.log(`[spike-bridge] listening on http://localhost:${port}`);
});