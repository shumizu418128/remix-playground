import type { ReactNode } from "react";
import { formatDateTime } from "../utils/utils";
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
  /** グループ情報 */
  group?: {
    id: number;
    subdomain: string;
    title: string;
    url: string;
  } | null;
  /** 住所 */
  address: string;
  /** 会場名 */
  place: string;
  /** 緯度 */
  lat: any;
  /** 経度 */
  lon: any;
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
        const isSameDay =
          new Date(event.started_at).toDateString() ===
          new Date(event.ended_at).toDateString();
        const dateRangeDisplay = (() => {
          if (!isSameDay) {
            return `${start} ~ ${end}`;
          }
          const startParts = start.split(" ");
          const endParts = end.split(" ");
          const startTime = startParts[startParts.length - 1];
          const endTime = endParts[endParts.length - 1];
          const startDay = startParts.slice(0, -1).join(" ");
          return `${startDay} ${startTime}~${endTime}`;
        })();

        return (
          <article
            id={`event-${event.id}`}
            tabIndex={-1}
            key={event.id}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow max-h-[30vh] overflow-hidden"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {event.image_url ? (
                <figure className="md:w-1/4 max-h-[30vh] overflow-hidden rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={event.image_url}
                      alt={`${event.title} のイメージ画像`}
                      className="h-48 max-h-full object-contain"
                      loading="lazy"
                    />
                  </a>
                </figure>
              ) : (
                <figure className="md:w-1/4 max-h-[30vh] overflow-hidden rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center" />
              )}
              <div className="flex-1 space-y-4">
                <header className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 space-x-1">
                    {event.hash_tag && <span>#{event.hash_tag}</span>}
                    {event.group && (
                      <a
                        href={event.group.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {event.group.title}
                      </a>
                    )}
                  </p>
                  <h3 className="text-xl font-semibold">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
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
                      {dateRangeDisplay}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      会場
                    </dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">
                      {event.place}
                      {event.address && (
                        <>
                          <br />
                          {event.address}
                        </>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      募集状況
                    </dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">
                      {event.accepted} / {event.limit ?? "上限なし"}
                      {event.waiting ? `（補欠 ${event.waiting}）` : ""}
                    </dd>
                  </div>
                  {event.event_type === "advertisement" && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      connpass上からは応募不可
                    </p>
                  )}
                </dl>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
