type ServerEnvKeys = "CONNPASS_API_KEY";

type ServerEnv = Record<ServerEnvKeys, string>;

let cachedEnv: ServerEnv | null = null;

function readEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env: Partial<ServerEnv> = {};
  const keys: ServerEnvKeys[] = ["CONNPASS_API_KEY"];

  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`${key} is required in .env`);
    }
    env[key] = value;
  }

  cachedEnv = env as ServerEnv;
  return cachedEnv;
}

export function getServerEnv(): ServerEnv {
  return readEnv();
}
