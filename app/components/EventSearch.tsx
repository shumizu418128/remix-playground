import { useEffect, useMemo, useState } from "react";
import { Form } from "react-router";

/**
 * イベント検索フォームの入力値の型定義
 */
export interface EventSearchFormData {
  /** 検索キーワード */
  keyword: string;
  /** 開始日 */
  startDate: string;
  /** 終了日 */
  endDate: string;
  /** 選択された都道府県の配列 */
  prefectures: string[];
}

/**
 * イベント検索コンポーネントのプロパティ
 */
export interface EventSearchProps {
  /** 検索実行時のコールバック関数 */
  onSearch?: (formData: EventSearchFormData) => void;
  /** 初期値 */
  initialValues?: Partial<EventSearchFormData>;
}

/**
 * 都道府県の選択肢
 */
const PREFECTURES = [
  { value: "tokyo", label: "東京" },
  { value: "saitama", label: "埼玉" },
  { value: "chiba", label: "千葉" },
  { value: "kanagawa", label: "神奈川" },
] as const;

/**
 * イベント検索コンポーネント
 *
 * キーワード、日付範囲、都道府県でイベントを検索するためのフォームを提供します。
 *
 * @param props - コンポーネントのプロパティ
 * @returns イベント検索フォームのJSX要素
 */
export function EventSearch({ initialValues }: EventSearchProps) {
  /**
   * Dateオブジェクトを日付入力用フォーマット(YYYY-MM-DD)へ変換
   */
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const today = useMemo(() => new Date(), []);
  const defaultEnd = useMemo(() => {
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    return end;
  }, [today]);
  const defaultStartDate = useMemo(() => formatDate(today), [today]);
  const defaultEndDate = useMemo(() => formatDate(defaultEnd), [defaultEnd]);

  const [keyword, setKeyword] = useState(initialValues?.keyword ?? "");
  const [startDate, setStartDate] = useState(
    initialValues?.startDate ?? defaultStartDate
  );
  const [endDate, setEndDate] = useState(
    initialValues?.endDate ?? defaultEndDate
  );
  const [selectedPrefectures, setSelectedPrefectures] = useState<string[]>(
    initialValues?.prefectures && initialValues.prefectures.length > 0
      ? initialValues.prefectures
      : ["tokyo"]
  );

  const prefecturesKey = useMemo(
    () => JSON.stringify(initialValues?.prefectures ?? ["tokyo"]),
    [initialValues?.prefectures]
  );

  useEffect(() => {
    setKeyword(initialValues?.keyword ?? "");
  }, [initialValues?.keyword]);

  useEffect(() => {
    setStartDate(initialValues?.startDate ?? defaultStartDate);
  }, [initialValues?.startDate, defaultStartDate]);

  useEffect(() => {
    setEndDate(initialValues?.endDate ?? defaultEndDate);
  }, [initialValues?.endDate, defaultEndDate]);

  useEffect(() => {
    setSelectedPrefectures(
      initialValues?.prefectures && initialValues.prefectures.length > 0
        ? initialValues.prefectures
        : ["tokyo"]
    );
  }, [prefecturesKey]);

  /**
   * 都道府県のチェックボックスの変更を処理
   */
  const handlePrefectureChange = (value: string, checked: boolean) => {
    if (checked) {
      setSelectedPrefectures([...selectedPrefectures, value]);
    } else {
      setSelectedPrefectures(
        selectedPrefectures.filter((p) => p !== value)
      );
    }
  };

  /**
   * 開始日・終了日が矛盾している場合、同じ日にする
   */
  const handleStartDateChange = (value: string) => {
    if (value > endDate) {
      setEndDate(value);
      setStartDate(value);
    }
    setStartDate(value);
  };
  const handleEndDateChange = (value: string) => {
    if (value < startDate) {
      setStartDate(value);
      setEndDate(value);
    }
    setEndDate(value);
  };


  return (
    <div className="w-full mx-auto p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md max-h-[45vh] min-h-[280px] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        イベント検索
      </h2>
      <Form method="post" className="space-y-4">
        {/* キーワード入力 */}
        <div>
          <label
            htmlFor="keyword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            キーワード
          </label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="イベント名やキーワードを入力"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* 日付範囲入力 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              開始日
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              終了日
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* 都道府県選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            都道府県
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PREFECTURES.map((pref) => (
              <label
                key={pref.value}
                className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  name="prefectures"
                  value={pref.value}
                  checked={selectedPrefectures.includes(pref.value)}
                  onChange={(e) =>
                    handlePrefectureChange(pref.value, e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {pref.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            検索
          </button>
        </div>
      </Form>
    </div>
  );
}
