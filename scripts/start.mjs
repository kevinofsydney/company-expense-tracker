import { spawn } from "node:child_process";
import path from "node:path";

const port = process.env.PORT ?? "3000";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const nextBinary = path.join(process.cwd(), "node_modules", ".bin", "next");
const child = spawn(
  nextBinary,
  ["start", "-p", port, "-H", hostname],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
