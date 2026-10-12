import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

const handle = serveStdio(createServer, {
  onerror: () => process.stderr.write("AudioBits MCP transport error.\n"),
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void handle.close().then(() => process.exit(0));
  });
}
