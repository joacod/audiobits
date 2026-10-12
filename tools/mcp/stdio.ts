import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

if (process.argv.length > 2) {
  if (process.argv.length !== 4 || process.argv[2] !== "--project") {
    process.stderr.write(
      "Usage: node mcp.mjs [--project <consumer-project>]\n",
    );
    process.exit(1);
  }
  try {
    process.chdir(process.argv[3]);
  } catch {
    process.stderr.write("AudioBits MCP consumer project is unavailable.\n");
    process.exit(1);
  }
}

const handle = serveStdio(createServer, {
  onerror: () => process.stderr.write("AudioBits MCP transport error.\n"),
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void handle.close().then(() => process.exit(0));
  });
}
