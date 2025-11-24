import { useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import { EventList } from "../components/EventList";
import type { EventListItem } from "../components/EventList";
import { EventSearch } from "../components/EventSearch";
import type { EventSearchFormData } from "../components/EventSearch";
import { Map } from "../components/Map";
import { getServerEnv } from "../utils/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "イベント検索" },
    { name: "description", content: "イベントを検索できます" },
  ];
}

type ActionResponse = {
  events: EventListItem[];
  formValues: EventSearchFormData;
  errorMessage?: string;
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

export async function action({ request }: Route.ActionArgs) {
  const { CONNPASS_API_KEY } = getServerEnv();
  const formData = await request.formData();
  const startDateValue = formData.get("startDate") as string | null;
  const endDateValue = formData.get("endDate") as string | null;
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
  const { includeKeywords, excludeKeywords } = parseKeywordInput(keywordInput);
  const prefectures = formData.getAll("prefectures") as string[];
  const formValues: EventSearchFormData = {
    keyword: keywordInput,
    startDate: startDateValue ?? "",
    endDate: endDateValue ?? "",
    prefectures:
      prefectures.length > 0
        ? prefectures
        : (["tokyo"] as EventSearchFormData["prefectures"]),
  };

  // 開始日から終了日までの日付を配列に入れる
  const dates: string[] = [];
  if (startDate && endDate) {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      dates.push(cursor.toISOString().split("T")[0].replace(/-/g, ""));
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

    // レスポンスのフィルター
    const normalizedIncludes = includeKeywords.map((kw) => kw.toLowerCase());
    const normalizedExcludes = excludeKeywords.map((kw) => kw.toLowerCase());
    const filteredEvents = events.filter((event) => {
      const passesBaseConditions =
        event.open_status === "preopen" &&
        event.place &&
        !/オンライン|online|abema/i.test(event.place) &&
        (!event.limit || event.limit > 10) &&
        !/(もくもく|coderdojo|永田町)/i.test(event.title ?? "");

      if (!passesBaseConditions) {
        return false;
      }

      if (normalizedIncludes.length === 0 && normalizedExcludes.length === 0) {
        return true;
      }

      const searchableText = buildSearchableText(event);
      const matchesIncludes =
        normalizedIncludes.length === 0 ||
        normalizedIncludes.every((keyword) => searchableText.includes(keyword));
      const matchesExcludes = normalizedExcludes.every(
        (keyword) => !searchableText.includes(keyword)
      );

      return matchesIncludes && matchesExcludes;
    });

    // descriptionのhtmlタグを削除
    filteredEvents.forEach((event) => {
      event.description = stripHtmlTags(event.description);
    });

    // 開催日順にソート
    filteredEvents.sort((a, b) => {
      return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
    });

    const payload: ActionResponse = { events: filteredEvents, formValues };
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

export default function Home() {
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const events = actionData?.events ?? [];
  const formValues = actionData?.formValues;
  const errorMessage = actionData?.errorMessage;
  const isSubmitting = navigation.state === "submitting";
  const shouldShowList = isSubmitting || Boolean(actionData);

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
              <Map events={events} isLoading={isSubmitting} />
            </div>
            <EventList
              events={events}
              isLoading={isSubmitting}
              error={errorMessage}
              emptyMessage="条件に一致するイベントが見つかりませんでした。"
            />
          </div>
        )}
      </div>
    </div>
  );
}
