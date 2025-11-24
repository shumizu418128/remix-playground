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

/**
 * 日時文字列を日本語ロケールで読みやすく整形します。
 *
 * Args:
 *   value: ISO形式などの日時文字列。
 *
 * Returns:
 *   整形済み文字列。変換できない場合は入力値、値がない場合は空文字列。
 */
export function formatDateTime(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}
