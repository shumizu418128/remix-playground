import { useState, type ReactNode, type MouseEvent } from "react";
import { formatDateTime } from "../utils/utils";
import { MAP_FOCUS_MARKER_EVENT } from "../constants/customEvents";
import { EVENT_HIGHLIGHT_CLASSES } from "../constants/highlightClasses";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventListItem | null>(
    null,
  );
  const dispatchFocusMarkerEvent = (eventId: number) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(MAP_FOCUS_MARKER_EVENT, {
        detail: { eventId },
      }),
    );
  };

  const highlightEventArticle = (eventId: number) => {
    if (typeof document === "undefined") {
      return;
    }

    const target = document.getElementById(`event-${eventId}`);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    EVENT_HIGHLIGHT_CLASSES.forEach((cls) => target.classList.add(cls));

    window.setTimeout(() => {
      EVENT_HIGHLIGHT_CLASSES.forEach((cls) => target.classList.remove(cls));
    }, 1800);
  };

  const shouldIgnoreArticleClick = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return Boolean(target.closest("a, button, input, textarea, select"));
  };

  const handleArticleClick = (
    eventId: number,
    domEvent: MouseEvent<HTMLElement>,
  ) => {
    if (shouldIgnoreArticleClick(domEvent.target)) {
      return;
    }

    dispatchFocusMarkerEvent(eventId);
    highlightEventArticle(eventId);
  };

  const handleViewAllClick = (event: EventListItem) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const renderValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return "なし";
    }
    if (typeof value === "string") {
      return value.split("\n").map((line, index, arr) => (
        <span key={index}>
          {line}
          {index < arr.length - 1 && <br />}
        </span>
      ));
    }

    if (typeof value === "object") {
      return (
        <pre className="text-xs whitespace-pre-wrap break-all bg-gray-100 dark:bg-gray-900 p-2 rounded">
          {JSON.stringify(value, null, 2)
            .split("\n")
            .map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
        </pre>
      );
    }
    return String(value);
  };

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
      <header className="text-sm text-gray-500 dark:text-gray-400">
        全 {events.length} 件のイベント
      </header>
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
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow max-h-[30vh] overflow-hidden cursor-pointer"
            onClick={(domEvent) => handleArticleClick(event.id, domEvent)}
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

                <dl className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      日時
                    </dt>
                    <dd className="text-sm text-gray-800 dark:text-gray-100">
                      {dateRangeDisplay}
                    </dd>
                  </div>
                  <div className="md:row-span-2">
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
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <span>
                          {event.event_type === "advertisement"
                            ? "connpassから応募不可"
                            : `${event.accepted} / ${
                                event.limit ?? "上限なし"
                              }${
                                event.waiting ? `（補欠 ${event.waiting}）` : ""
                              }`}
                        </span>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          onClick={() => handleViewAllClick(event)}
                        >
                          詳細
                        </button>
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        );
      })}
      {isModalOpen && selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-3xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                イベント詳細
              </h4>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={closeModal}
              >
                閉じる
              </button>
            </header>
            <dl className="space-y-3">
              {Object.entries(selectedEvent).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {key}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                    {renderValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}
