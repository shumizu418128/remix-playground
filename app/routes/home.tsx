import { useActionData, useNavigation } from "react-router";
import JapaneseHolidays from "japanese-holidays";
import type { Route } from "./+types/home";
import { EventList } from "../components/EventList";
import type { EventListItem } from "../components/EventList";
import { EventSearch } from "../components/EventSearch";
import type {
  DayFilterOption,
  EventSearchFormData,
} from "../components/EventSearch";
import { EventMap } from "../components/EventMap";
import { getServerEnv } from "../utils/utils";

/**
 * Connpass の ymd 検索に含める日かどうかを判定します（日本時間の暦・祝日）。
 *
 * @param cursor - 評価する日付
 * @param excludeSaturday - 土曜を除外するか
 * @param weekendsAndHolidaysOnly - 土日祝に限定するか
 * @param weekdaysOnly - 平日（土日祝以外）に限定するか
 * @param fridayOnly - 金曜に限定するか
 * @returns 検索対象に含めるなら true
 */
const shouldIncludeDayForConnpassSearch = (
  cursor: Date,
  excludeSaturday: boolean,
  weekendsAndHolidaysOnly: boolean,
  weekdaysOnly: boolean,
  fridayOnly: boolean
): boolean => {
  const weekdayJst = JapaneseHolidays.getJDay(cursor);
  const isWeekend = weekdayJst === 0 || weekdayJst === 6;
  const isHoliday = Boolean(JapaneseHolidays.isHolidayAt(cursor));

  if (fridayOnly) {
    return weekdayJst === 5;
  }
  if (weekendsAndHolidaysOnly) {
    return isWeekend || isHoliday;
  }
  if (weekdaysOnly) {
    return !isWeekend && !isHoliday;
  }
  if (excludeSaturday && weekdayJst === 6) {
    return false;
  }
  return true;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "イベント検索" },
    { name: "description", content: "イベントを検索できます" },
    // Googleなどの検索エンジンにインデックスさせない
    { name: "robots", content: "noindex, nofollow" },
    { name: "googlebot", content: "noindex, nofollow" },
  ];
}

type ActionResponse = {
  events: EventListItem[];
  formValues: EventSearchFormData;
  errorMessage?: string;
  hasMoreResults?: boolean;
  actualLength?: number;
};

/**
 * ユーザー入力から除外キーワードと含めるキーワードを抽出します。
 *
 * @param input - フォームに入力されたキーワード文字列
 * @returns 抽出結果
 */
const parseKeywordInput = (input: string | null) => {
  if (!input) {
    return { includeKeywords: [] as string[], excludeKeywords: [] as string[] };
  }

  const tokens = input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const includeKeywords: string[] = [];
  const excludeKeywords: string[] = [];

  tokens.forEach((token) => {
    if (token.startsWith("-") && token.length > 1) {
      excludeKeywords.push(token.slice(1));
    } else if (token !== "-") {
      includeKeywords.push(token);
    }
  });

  return { includeKeywords, excludeKeywords };
};

/**
 * HTMLタグを除去した文字列を返します。
 *
 * @param value - HTMLを含む可能性のある文字列
 * @returns タグ除去後の文字列
 */
/** フォームの dayFilter として許容する値 */
const DAY_FILTER_VALUES: readonly DayFilterOption[] = [
  "all",
  "excludeSaturday",
  "weekendsAndHolidaysOnly",
  "weekdaysOnly",
  "fridayOnly",
] as const;

/**
 * フォーム値を DayFilterOption に正規化します。
 *
 * @param value - dayFilter フィールドの生の値
 * @returns 解釈した開催日の絞り込み
 */
const parseDayFilter = (value: string | null): DayFilterOption => {
  if (value && DAY_FILTER_VALUES.includes(value as DayFilterOption)) {
    return value as DayFilterOption;
  }
  return "excludeSaturday";
};

/**
 * 開催日の絞り込みを、日付判定用の2フラグに変換します。
 *
 * @param dayFilter - 開催日の絞り込み
 * @returns Connpass 検索用のフラグ
 */
const dayFilterToBooleans = (
  dayFilter: DayFilterOption
): {
  excludeSaturday: boolean;
  weekendsAndHolidaysOnly: boolean;
  weekdaysOnly: boolean;
  fridayOnly: boolean;
} => {
  switch (dayFilter) {
    case "all":
      return {
        excludeSaturday: false,
        weekendsAndHolidaysOnly: false,
        weekdaysOnly: false,
        fridayOnly: false,
      };
    case "excludeSaturday":
      return {
        excludeSaturday: true,
        weekendsAndHolidaysOnly: false,
        weekdaysOnly: false,
        fridayOnly: false,
      };
    case "weekendsAndHolidaysOnly":
      return {
        excludeSaturday: false,
        weekendsAndHolidaysOnly: true,
        weekdaysOnly: false,
        fridayOnly: false,
      };
    case "weekdaysOnly":
      return {
        excludeSaturday: false,
        weekendsAndHolidaysOnly: false,
        weekdaysOnly: true,
        fridayOnly: false,
      };
    case "fridayOnly":
      return {
        excludeSaturday: false,
        weekendsAndHolidaysOnly: false,
        weekdaysOnly: false,
        fridayOnly: true,
      };
    default:
      return {
        excludeSaturday: true,
        weekendsAndHolidaysOnly: false,
        weekdaysOnly: false,
        fridayOnly: false,
      };
  }
};

const stripHtmlTags = (value?: string) => {
  if (!value) {
    return "";
  }
  return value.replace(/<[^>]*>?/g, "");
};

/**
 * イベント情報から検索対象のテキストを作成します。
 *
 * @param event - Connpassイベント
 * @returns 検索対象のテキスト
 */
const buildSearchableText = (event: EventListItem) => {
  return [
    event.title,
    event.place,
    event.address,
    stripHtmlTags(event.description),
  ]
    .filter((field): field is string => Boolean(field))
    .join(" ")
    .toLowerCase();
};

const isEventStartingAfter19Jst = (startedAt: string) => {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const parts = new Intl.DateTimeFormat("ja-JP", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).formatToParts(date);
  const hourInJst = Number(parts.find((part) => part.type === "hour")?.value);
  const minuteInJst = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hourInJst) || !Number.isFinite(minuteInJst)) {
    return false;
  }
  return hourInJst > 19 || (hourInJst === 19 && minuteInJst >= 0);
};

const isWeekdayNonHolidayJst = (startedAt: string) => {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const weekdayJst = JapaneseHolidays.getJDay(date);
  const isWeekend = weekdayJst === 0 || weekdayJst === 6;
  const isHoliday = Boolean(JapaneseHolidays.isHolidayAt(date));
  return !isWeekend && !isHoliday;
};

const passesWeekdayAfter19Filter = (startedAt: string) => {
  // 平日(祝日を除く)のみ19時以降を必須とし、土日祝は時刻制限をかけない。
  if (!isWeekdayNonHolidayJst(startedAt)) {
    return true;
  }
  return isEventStartingAfter19Jst(startedAt);
};

export async function action({ request }: Route.ActionArgs) {
  const { CONNPASS_API_KEY } = getServerEnv();
  const formData = await request.formData();
  const startDateValue = formData.get("startDate") as string | null;
  const endDateValue = formData.get("endDate") as string | null;
  const dayFilter = parseDayFilter(
    formData.get("dayFilter") as string | null
  );
  const { excludeSaturday, weekendsAndHolidaysOnly, weekdaysOnly, fridayOnly } =
    dayFilterToBooleans(dayFilter);
  const startDate =
    startDateValue && !Number.isNaN(Date.parse(startDateValue))
      ? new Date(startDateValue)
      : null;
  const endDate =
    endDateValue && !Number.isNaN(Date.parse(endDateValue))
      ? new Date(endDateValue)
      : startDate;
  const rawKeyword = formData.get("keyword");
  const keywordInput = typeof rawKeyword === "string" ? rawKeyword : "";
  const onlyAfter19 = formData.get("onlyAfter19") === "1";
  const { includeKeywords, excludeKeywords } = parseKeywordInput(keywordInput);
  const prefectures = formData.getAll("prefectures") as string[];
  const formValues: EventSearchFormData = {
    keyword: keywordInput,
    onlyAfter19,
    startDate: startDateValue ?? "",
    endDate: endDateValue ?? "",
    prefectures:
      prefectures.length > 0
        ? prefectures
        : (["tokyo"] as EventSearchFormData["prefectures"]),
    dayFilter,
  };

  // 開始日から終了日までの日付を配列に入れる
  const dates: string[] = [];
  if (startDate && endDate) {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      if (
        shouldIncludeDayForConnpassSearch(
          cursor,
          excludeSaturday,
          weekendsAndHolidaysOnly,
          weekdaysOnly,
          fridayOnly
        )
      ) {
        dates.push(cursor.toISOString().split("T")[0].replace(/-/g, ""));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // 検索パラメータを作成
  const params = new URLSearchParams();
  const maxCount = 100;
  params.set("count", maxCount.toString());
  if (includeKeywords.length > 0) {
    params.set("keyword", includeKeywords.join(" "));
  }
  if (dates.length > 0) {
    dates.forEach((date) => {
      params.append("ymd", date);
    });
  }
  if (prefectures.length > 0) {
    prefectures.forEach((prefecture) => {
      params.append("prefecture", prefecture);
    });
  }

  try {
    // リクエスト
    const response = await fetch(
      `https://connpass.com/api/v2/events/?${params.toString()}`,
      {
        headers: {
          "X-API-Key": CONNPASS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Connpass API request failed");
    }
    const result = (await response.json()) as { events?: EventListItem[] };
    const events = result.events ?? [];
    const actualLength = events.length;
    const hasMoreResults = actualLength >= maxCount;

    // レスポンスのフィルター
    const normalizedIncludes = includeKeywords.map((kw) => kw.toLowerCase());
    const normalizedExcludes = excludeKeywords.map((kw) => kw.toLowerCase());
    const filteredEvents = events.filter((event) => {
      const passesBaseConditions =
        event.open_status === "preopen" &&
        event.place &&
        !/オンライン|online|abema|youtube|zoom|discord|teams/i.test(event.place) &&
        (!event.limit || event.limit > 10) &&
        !/(もくもく|黙々|ゆるもく会|coderdojo|永田町|ハッカソン|hackathon|girl)/i.test(event.title ?? "") &&
        (event.accepted > 0 || event.event_type === "advertisement");

      if (!passesBaseConditions) {
        return false;
      }

      if (normalizedIncludes.length === 0 && normalizedExcludes.length === 0) {
        if (onlyAfter19) {
          return passesWeekdayAfter19Filter(event.started_at);
        }
        return true;
      }

      const searchableText = buildSearchableText(event);
      const matchesIncludes =
        normalizedIncludes.length === 0 ||
        normalizedIncludes.every((keyword) => searchableText.includes(keyword));
      const matchesExcludes = normalizedExcludes.every(
        (keyword) => !searchableText.includes(keyword)
      );

      if (!matchesIncludes || !matchesExcludes) {
        return false;
      }

      if (onlyAfter19) {
        return passesWeekdayAfter19Filter(event.started_at);
      }

      return true;
    });

    // descriptionのhtmlタグを削除
    filteredEvents.forEach((event) => {
      event.description = stripHtmlTags(event.description);
    });

    // 開催日順にソート
    filteredEvents.sort((a, b) => {
      return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
    });

    const payload: ActionResponse = { events: filteredEvents, formValues, hasMoreResults, actualLength };
    return Response.json(payload);
  } catch (error) {
    console.error(error);
    const payload: ActionResponse = {
      events: [],
      formValues,
      errorMessage: "Connpass APIの取得に失敗しました。しばらく待って再度お試しください。",
    };
    return Response.json(payload, { status: 502 });
  }
}

/**
 * FormData から EventSearchFormData を組み立てます。
 * 検索送信中（actionData がまだ無いとき）にユーザー入力値を表示するために使用します。
 */
const formValuesFromFormData = (formData: FormData): EventSearchFormData => {
  const keyword = (formData.get("keyword") as string | null) ?? "";
  const onlyAfter19 = formData.get("onlyAfter19") === "1";
  const startDate = (formData.get("startDate") as string | null) ?? "";
  const endDate = (formData.get("endDate") as string | null) ?? "";
  const prefectures = formData.getAll("prefectures") as string[];
  const dayFilter = parseDayFilter(
    (formData.get("dayFilter") as string | null) ?? "excludeSaturday"
  );
  return {
    keyword,
    onlyAfter19,
    startDate,
    endDate,
    prefectures:
      prefectures.length > 0
        ? prefectures
        : (["tokyo"] as EventSearchFormData["prefectures"]),
    dayFilter,
  };
};

export default function Home() {
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const events = actionData?.events ?? [];
  const errorMessage = actionData?.errorMessage;
  const isSubmitting = navigation.state === "submitting";
  const shouldShowList = isSubmitting || Boolean(actionData);

  /** 検索中は送信したフォームの値、完了後は action の返却値を使用する */
  const formValues: EventSearchFormData | undefined =
    isSubmitting && navigation.formData
      ? formValuesFromFormData(navigation.formData)
      : actionData?.formValues;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="w-full space-y-8">
        {!shouldShowList && (
          <div className="max-w-lg mx-auto">
            <EventSearch initialValues={formValues} />
          </div>
        )}
        {shouldShowList && (
          <div className="grid gap-8 items-start lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <div className="sticky top-6 space-y-4 self-start">
              <EventSearch initialValues={formValues} />
              <EventMap events={events} isLoading={isSubmitting} />
            </div>
            <EventList
              events={events}
              isLoading={isSubmitting}
              error={errorMessage}
              emptyMessage="条件に一致するイベントが見つかりませんでした。"
              hasMoreResults={actionData?.hasMoreResults}
              actualLength={actionData?.actualLength}
            />
          </div>
        )}
      </div>
    </div>
  );
}
