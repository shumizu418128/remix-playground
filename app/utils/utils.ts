import JapaneseHolidays from "japanese-holidays";

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
 * その日が日本の祝日（振替休日を含む）のときは、曜日表記の直後に「祝」を付けます
 * （例: 5/6(水祝) 14:30）。
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

  const formatter = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
  });

  const isHoliday = Boolean(JapaneseHolidays.isHolidayAt(date));
  let result = "";
  for (const part of formatter.formatToParts(date)) {
    if (part.type === "weekday") {
      result += part.value;
      if (isHoliday) {
        result += "祝";
      }
    } else {
      result += part.value;
    }
  }
  return result;
}

/**
 * 開始が平日かつ祝日でなく、日本時間で19時より前かどうかを返します。
 *
 * 土曜・日曜および日本の祝日（振替休日を含む）のときは false です。
 *
 * Args:
 *   startedAt: ISO 形式などの開始日時文字列。
 *
 * Returns:
 *   日時の直前に「平日の早時間帯開始」の警告を付けるべきなら true。
 */
export function shouldShowEarlyWeekdayStartWarning(startedAt: string): boolean {
  if (!startedAt) {
    return false;
  }

  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const dayOfWeekJapan = JapaneseHolidays.getJDay(date);
  if (dayOfWeekJapan === 0 || dayOfWeekJapan === 6) {
    return false;
  }

  if (JapaneseHolidays.isHolidayAt(date)) {
    return false;
  }

  const minutesSinceMidnightJapan =
    JapaneseHolidays.getJHours(date) * 60 + JapaneseHolidays.getJMinutes(date);
  return minutesSinceMidnightJapan < 19 * 60;
}
