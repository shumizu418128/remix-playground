import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventListItem } from "./EventList";
import { formatDateTime } from "../utils/utils";
import { MAP_FOCUS_MARKER_EVENT } from "../constants/customEvents";
import { EVENT_HIGHLIGHT_CLASSES } from "../constants/highlightClasses";

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_SCRIPT_ID = "leaflet-script";
const LEAFLET_STYLE_ID = "leaflet-style";

let leafletPromise: Promise<any> | null = null;

type MarkerLookup = globalThis.Map<number, any>;

/**
 * Leaflet本体とスタイルシートを動的に読み込みます。
 *
 * Returns:
 *   Leafletのグローバルオブジェクト。
 */
const ensureLeafletAssets = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leafletはブラウザ環境でのみ利用できます。"));
  }

  if (!document.getElementById(LEAFLET_STYLE_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_STYLE_ID;
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.L));
        existingScript.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.id = LEAFLET_SCRIPT_ID;
      script.async = true;
      script.src = LEAFLET_JS_URL;
      script.onload = () => resolve(window.L);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  return leafletPromise;
};

/**
 * LeafletがDOM要素へ付与した内部IDを除去します。
 *
 * Args:
 *   container: Leafletマップを描画するdiv要素。
 */
const resetLeafletContainer = (container: HTMLDivElement | null) => {
  if (!container) {
    return;
  }

  const stampedContainer = container as HTMLDivElement & { _leaflet_id?: string | number };
  if (stampedContainer._leaflet_id) {
    delete stampedContainer._leaflet_id;
  }
};

export interface MapProps {
  /** マッピング対象のイベント配列 */
  events: EventListItem[];
  /** 読み込み中フラグ */
  isLoading?: boolean;
}

/**
 * ConnpassのイベントをOpenStreetMap上に描画します。
 *
 * Args:
 *   events: 緯度経度情報を含むイベント配列。
 *
 * Returns:
 *   イベントが存在する場合はLeafletマップ、存在しない場合は案内文。
 */
export function EventMap({ events, isLoading = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const markerEventMapRef = useRef<MarkerLookup>(new globalThis.Map<number, any>());
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const prevLoadingRef = useRef(false);

  const destroyEventMapInstance = useCallback(() => {
    mapRef.current?.remove();
    mapRef.current = null;
    markersLayerRef.current = null;
    markerEventMapRef.current = new globalThis.Map<number, any>();
    resetLeafletContainer(containerRef.current);
  }, []);

  const geoEvents = useMemo(() => {
    return events.reduce<EventListItem[]>((acc, event) => {
      const lat = Number(event.lat);
      const lon = Number(event.lon);

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        acc.push({ ...event, lat, lon });
      }

      return acc;
    }, []);
  }, [events]);

  const scrollToEventArticle = (eventId: number) => {
    if (typeof document === "undefined") {
      return;
    }

    const target = document.getElementById(`event-${eventId}`);
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const middleOffset = absoluteTop - window.innerHeight / 2 + rect.height / 2;

    window.scrollTo({
      top: Math.max(middleOffset, 0),
      behavior: "smooth",
    });

    target.focus({ preventScroll: true });

    EVENT_HIGHLIGHT_CLASSES.forEach((cls) => target.classList.add(cls));

    window.setTimeout(() => {
      EVENT_HIGHLIGHT_CLASSES.forEach((cls) => target.classList.remove(cls));
    }, 1800);
  };

  const focusMarkerByEventId = useCallback(
    (eventId: number) => {
      if (!mapRef.current || !markerEventMapRef.current.has(eventId)) {
        return;
      }

      const marker = markerEventMapRef.current.get(eventId);
      if (!marker) {
        return;
      }

      if (typeof marker.getLatLng === "function") {
        const latLng = marker.getLatLng();
        mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom() ?? 5, 8), {
          animate: true,
        });
      }

      if (typeof marker.openPopup === "function") {
        marker.openPopup();
      }
    },
    [],
  );

  useEffect(() => {
    const handleFocusMarker = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const eventId = event.detail?.eventId;
      if (typeof eventId !== "number") {
        return;
      }

      focusMarkerByEventId(eventId);
    };

    window.addEventListener(MAP_FOCUS_MARKER_EVENT, handleFocusMarker as EventListener);
    return () => {
      window.removeEventListener(MAP_FOCUS_MARKER_EVENT, handleFocusMarker as EventListener);
    };
  }, [focusMarkerByEventId]);

  useEffect(() => {
    if (isLoading) {
      return () => {
        prevLoadingRef.current = true;
      };
    }

    const justFinishedLoading = prevLoadingRef.current;
    const activeContainer = isFullScreenOpen ? fullScreenContainerRef.current : containerRef.current;
    if (!activeContainer || !geoEvents.length) {
      return () => {
        prevLoadingRef.current = isLoading;
      };
    }

    let isMounted = true;

    const renderEventMap = async () => {
      try {
        const L = await ensureLeafletAssets();
        const currentContainer = isFullScreenOpen ? fullScreenContainerRef.current : containerRef.current;
        if (!isMounted || !currentContainer) {
          return;
        }

        const containerMismatch =
          mapRef.current &&
          typeof mapRef.current.getContainer === "function" &&
          mapRef.current.getContainer() !== currentContainer;

        const forceRecreate = justFinishedLoading && mapRef.current;
        if (containerMismatch || forceRecreate) {
          destroyEventMapInstance();
        }

        if (!mapRef.current) {
          resetLeafletContainer(currentContainer);
          mapRef.current = L.map(currentContainer, {
            center: [geoEvents[0].lat, geoEvents[0].lon],
            zoom: 5,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
          }).addTo(mapRef.current);

          // 検索2回目以降はコンテナが再マウント直後でサイズが0のことがあるため、
          // レイアウト完了後に invalidateSize を複数回呼ぶ
          const scheduleInvalidateSize = () => {
            requestAnimationFrame(() => {
              mapRef.current?.invalidateSize();
            });
            setTimeout(() => {
              if (isMounted && mapRef.current) {
                mapRef.current.invalidateSize();
              }
            }, 100);
          };
          scheduleInvalidateSize();
        }

        if (markersLayerRef.current) {
          markersLayerRef.current.remove();
        }

        // 既存マップでマーカーだけ更新する場合も、タイルが正しく描画されるようサイズを再計算
        if (mapRef.current) {
          requestAnimationFrame(() => {
            mapRef.current?.invalidateSize();
          });
        }

        const markersLayer = L.layerGroup();
        markerEventMapRef.current = new globalThis.Map<number, any>();

        const createPopupContent = (event: EventListItem) => {
          const container = document.createElement("div");
          container.className = "space-y-1";

          const titleLink = document.createElement("a");
          titleLink.className =
            "text-left text-blue-600 hover:underline font-semibold focus:outline-none";
          titleLink.textContent = event.title;
          titleLink.href = event.url;
          titleLink.target = "_blank";
          titleLink.rel = "noreferrer noopener";
          titleLink.addEventListener("click", (clickEvent) => {
            clickEvent.stopPropagation();
          });

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

          const dateText = document.createElement("p");
          dateText.className = "text-xs text-gray-600";
          dateText.textContent = dateRangeDisplay;

          if (event.event_type === "advertisement") {
            dateText.textContent += " (connpass上からは応募不可)";
          }

          container.appendChild(titleLink);
          container.appendChild(dateText);
          return container;
        };

        geoEvents.forEach((event) => {
          const marker = L.marker([event.lat, event.lon]).bindPopup(createPopupContent(event));

          marker.on("click", () => {
            scrollToEventArticle(event.id);
          });

          marker.addTo(markersLayer);
          markerEventMapRef.current.set(event.id, marker);
        });

        markersLayer.addTo(mapRef.current);
        markersLayerRef.current = markersLayer;

        if (geoEvents.length === 1) {
          mapRef.current.setView([geoEvents[0].lat, geoEvents[0].lon], 12);
        } else {
          const bounds = L.latLngBounds(geoEvents.map((event) => [event.lat, event.lon]));
          mapRef.current.fitBounds(bounds.pad(0.2));
        }
      } catch (error) {
        console.error("Leafletの読み込みに失敗しました: ", error);
      }
    };

    renderEventMap();

    return () => {
      isMounted = false;
      prevLoadingRef.current = isLoading;
    };
  }, [destroyEventMapInstance, geoEvents, isLoading, isFullScreenOpen]);

  useEffect(() => {
    if (!isLoading && geoEvents.length === 0) {
      destroyEventMapInstance();
    }
  }, [destroyEventMapInstance, geoEvents.length, isLoading]);

  useEffect(() => {
    return () => {
      destroyEventMapInstance();
    };
  }, [destroyEventMapInstance]);

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">マップ表示</h2>
        <div className="w-full h-128 rounded-lg shadow bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </section>
    );
  }

  if (!geoEvents.length) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">マップ表示</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">位置情報付きのイベントがありません。</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">マップ表示</h2>
        <button
          type="button"
          onClick={() => setIsFullScreenOpen(true)}
          className="shrink-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          全画面表示
        </button>
      </div>
      <div
        ref={containerRef}
        className={`w-full h-[45vh] min-h-[280px] max-h-[520px] rounded-lg shadow bg-gray-200 dark:bg-gray-700 overflow-hidden ${isFullScreenOpen ? "flex items-center justify-center" : ""}`}
      >
        {isFullScreenOpen && (
          <p className="text-sm text-gray-600 dark:text-gray-400">マップは全画面で表示中です</p>
        )}
      </div>
      {isFullScreenOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="マップ全画面表示"
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40"
          onClick={() => setIsFullScreenOpen(false)}
        >
          <div
            className="relative w-full h-full max-w-[90vw] max-h-[90vh] rounded-lg shadow-xl overflow-hidden bg-gray-200 dark:bg-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={fullScreenContainerRef}
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}
    </section>
  );
}

declare global {
  interface Window {
    L?: any;
  }
}
