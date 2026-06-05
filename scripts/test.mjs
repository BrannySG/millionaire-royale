import { spawnSync } from "node:child_process";

for (const command of [
  ["node", ["scripts/validate-questions.mjs"]],
  ["pnpm", ["vitest", "run"]],
]) {
  const result = spawnSync(command[0], command[1], { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
