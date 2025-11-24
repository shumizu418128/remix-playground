import { useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import { EventList } from "../components/EventList";
import type { EventListItem } from "../components/EventList";
import { EventSearch } from "../components/EventSearch";
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
  errorMessage?: string;
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
  const keyword = formData.get("keyword") as string;
  const prefectures = formData.getAll("prefectures") as string[];

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
  if (keyword) {
    params.set("keyword", keyword);
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
    const filteredEvents = events.filter((event) => {
      return event.open_status === "preopen" && event.place !== "オンライン" && (!event.limit || event.limit > 10);
    });

    // descriptionのhtmlタグを削除
    filteredEvents.forEach((event) => {
      event.description = event.description.replace(/<[^>]*>?/g, "");
    });

    // 開催日順にソート
    filteredEvents.sort((a, b) => {
      return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
    });

    const payload: ActionResponse = { events: filteredEvents };

    return Response.json(payload);
  } catch (error) {
    console.error(error);
    const payload: ActionResponse = {
      events: [],
      errorMessage: "Connpass APIの取得に失敗しました。しばらく待って再度お試しください。",
    };
    return Response.json(payload, { status: 502 });
  }
}

export default function Home() {
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const events = actionData?.events ?? [];
  const errorMessage = actionData?.errorMessage;
  const isSubmitting = navigation.state === "submitting";
  const shouldShowList = isSubmitting || Boolean(actionData);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="w-full space-y-8">
        {!shouldShowList && (
          <div className="max-w-md mx-auto">
            <EventSearch />
          </div>
        )}
        {shouldShowList && (
          <div className="grid gap-8 items-start lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <div className="sticky top-6 space-y-4 self-start">
              <EventSearch />
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
