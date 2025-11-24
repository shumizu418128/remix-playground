import type { ReactNode } from "react";

/**
 * Connpass APIから返るイベント情報
 */
export interface EventListItem {
  /** イベントID */
  id: number;
  /** タイトル */
  title: string;
  /** 概要 */
  description: string;
  /** イベントURL */
  url: string;
  /** イベント画像URL */
  image_url: string;
  /** 関連ハッシュタグ */
  hash_tag: string;
  /** 開始日時 */
  started_at: string;
  /** 終了日時 */
  ended_at: string;
  /** 参加人数上限 */
  limit: number;
  /** イベントタイプ */
  event_type: string;
  /** 募集状況 */
  open_status: string;
  /** 住所 */
  address: string;
  /** 会場名 */
  place: string;
  /** 緯度 */
  lat: any;
  /** 経度 */
  lon: any;
  /** 主催者名 */
  owner_display_name: string;
  /** 参加確定人数 */
  accepted: number;
  /** 補欠人数 */
  waiting: number;
  /** 更新日時 */
  updated_at: string;
}

/**
 * イベント一覧コンポーネントのプロパティ
 */
export interface EventListProps {
  /** 表示対象のイベント配列 */
  events: EventListItem[];
  /** 読み込み中フラグ */
  isLoading?: boolean;
  /** エラー表示用メッセージ */
  error?: ReactNode;
  /** イベントが存在しないときの代替メッセージ */
  emptyMessage?: ReactNode;
}

/**
 * 日時文字列を日本語ロケールで読みやすく整形します。
 *
 * Args:
 *   value: ISO形式などの日時文字列。
 *
 * Returns:
 *   整形済み文字列。変換できない場合は入力値、値がない場合はnull。
 */
const formatDateTime = (value?: string) => {
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
};

/**
 * イベント情報をカード形式で表示します。
 *
 * Args:
 *   props: イベント配列や状態を含むプロパティ。
 *
 * Returns:
 *   JSX要素。状態に応じて読み込み・エラー・結果を切り替えます。
 */
export function EventList({
  events,
  isLoading = false,
  error,
  emptyMessage,
}: EventListProps) {
  if (isLoading) {
    return (
      <section className="w-full space-y-4">
        <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow">
          <p className="text-gray-700 dark:text-gray-200">loading...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full space-y-4">
        <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      </section>
    );
  }

  if (!events.length) {
    return (
      <section className="w-full space-y-4">
        <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow text-gray-600 dark:text-gray-300">
          {emptyMessage}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {events.map((event) => {
        const start = formatDateTime(event.started_at);
        const end = formatDateTime(event.ended_at);

        return (
          <article
            key={event.id}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4"
          >
            <header className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {event.hash_tag ? `#${event.hash_tag}` : "イベント"}
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {event.title}
                </a>
              </h3>
              {event.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {event.description}
                </p>
              )}
            </header>

            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  日時
                </dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {new Date(event.started_at).toDateString() === new Date(event.ended_at).toDateString()
                    ? `${start.split(' ').slice(0, -1).join(' ')} ${start.split(' ').pop()}~${end.split(' ').pop()}`
                    : `${start} ~ ${end}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  会場
                </dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {event.place}
                  {event.address ? `（${event.address}）` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  募集状況
                </dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {event.accepted} / {event.limit}
                  {event.waiting ? `（補欠 ${event.waiting}）` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  主催
                </dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">
                  {event.owner_display_name}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </section>
  );
}
