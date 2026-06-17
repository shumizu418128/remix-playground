import type { ReactNode } from "react";

/**
 * 検索結果画面のタブパネル種別
 */
export type ResultsPanel = "search" | "map" | "list";

/**
 * ResultsPanelTabs のプロパティ
 */
export interface ResultsPanelTabsProps {
  /** 現在アクティブなパネル */
  activePanel: ResultsPanel;
  /** パネル切り替え時のコールバック */
  onPanelChange: (panel: ResultsPanel) => void;
  /** 検索フォームの内容 */
  searchContent: ReactNode;
  /** マップの内容 */
  mapContent: ReactNode;
  /** イベント一覧の内容 */
  listContent: ReactNode;
  /** マップに表示可能なイベント件数 */
  mapEventCount?: number;
}

const TAB_ITEMS: { id: ResultsPanel; label: string }[] = [
  { id: "search", label: "検索" },
  { id: "map", label: "マップ" },
  { id: "list", label: "一覧" },
];

/**
 * モバイル向けの検索・マップ・一覧タブレイアウト
 *
 * @param props - タブ状態と各パネルの内容
 * @returns タブUIとパネル領域
 */
export const ResultsPanelTabs = ({
  activePanel,
  onPanelChange,
  searchContent,
  mapContent,
  listContent,
  mapEventCount,
}: ResultsPanelTabsProps) => {
  const panelContent: Record<ResultsPanel, ReactNode> = {
    search: searchContent,
    map: mapContent,
    list: listContent,
  };

  return (
    <div className="flex min-h-dvh flex-col gap-2">
      <div
        role="tablist"
        aria-label="検索結果の表示切り替え"
        className="grid h-12 shrink-0 grid-cols-3 gap-2"
      >
        {TAB_ITEMS.map((tab) => {
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onPanelChange(tab.id)}
              className={`flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === "map" && mapEventCount !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {mapEventCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {TAB_ITEMS.map((tab) => {
        const isActive = activePanel === tab.id;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={!isActive}
            className={`min-h-0 flex-1 overflow-y-auto ${
              isActive ? "flex flex-col" : "hidden"
            }`}
          >
            {panelContent[tab.id]}
          </div>
        );
      })}
    </div>
  );
};
