import fs from 'node:fs';
import path from 'node:path';

export type Env = {
  host: string;
  port: number;
  dataDir: string;
};

export function getEnv(): Env {
  return {
    host: process.env.HOST ?? '127.0.0.1',
    port: Number(process.env.PORT ?? 3000),
    dataDir: process.env.DATA_DIR ?? findWorkspaceDataDir()
  };
}

function findWorkspaceDataDir(): string {
  let current = process.cwd();

  for (let depth = 0; depth < 6; depth += 1) {
    const packageJsonPath = path.join(current, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8');

      if (packageJson.includes('"workspaces"')) {
        return path.join(current, 'data');
      }
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return path.resolve(process.cwd(), 'data');
}
