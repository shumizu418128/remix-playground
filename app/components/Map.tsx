import { useEffect, useMemo, useRef } from "react";
import type { EventListItem } from "./EventList";

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_SCRIPT_ID = "leaflet-script";
const LEAFLET_STYLE_ID = "leaflet-style";

let leafletPromise: Promise<any> | null = null;

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
export function Map({ events, isLoading = false }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

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

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!containerRef.current || !geoEvents.length) {
      return;
    }

    let isMounted = true;

    const renderMap = async () => {
      try {
        const L = await ensureLeafletAssets();
        if (!isMounted || !containerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            center: [geoEvents[0].lat, geoEvents[0].lon],
            zoom: 5,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
          }).addTo(mapRef.current);

          requestAnimationFrame(() => {
            mapRef.current?.invalidateSize();
          });
        }

        if (markersLayerRef.current) {
          markersLayerRef.current.remove();
        }

        const markersLayer = L.layerGroup();

        geoEvents.forEach((event) => {
          L.marker([event.lat, event.lon])
            .bindPopup(
              `<strong>${event.title}</strong><br/>${event.place ? `${event.place}<br/>` : ""}${
                event.address ?? ""
              }`,
            )
            .addTo(markersLayer);
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

    renderMap();

    return () => {
      isMounted = false;
    };
  }, [geoEvents, isLoading]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">マップ表示</h2>
        <div className="w-full h-96 rounded-lg shadow bg-gray-200 dark:bg-gray-700 animate-pulse" />
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">マップ表示</h2>
      <div
        ref={containerRef}
        className="w-full h-200 rounded-lg shadow bg-gray-200 dark:bg-gray-700 overflow-hidden"
      />
    </section>
  );
}

declare global {
  interface Window {
    L?: any;
  }
}
