import type { Route } from "./+types/home";
import { EventSearch, type EventSearchFormData } from "../components/EventSearch";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "イベント検索" },
    { name: "description", content: "イベントを検索できます" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const startDate = new Date(formData.get("startDate") as string);
  const endDate = new Date(formData.get("endDate") as string);
  const keyword = formData.get("keyword") as string;
  const prefectures = formData.getAll("prefectures") as string[];

  // 開始日から終了日までの日付を配列に入れる
  const dates = [];
  const date = new Date(startDate);
  while (date <= new Date(endDate)) {
    dates.push(date.toISOString().split("T")[0].replace(/-/g, ""));
    date.setDate(date.getDate() + 1);
  }
  console.log(dates);

  // TODO: キーワード・日付・都道府県でイベントを検索する
  return null;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="container mx-auto max-w-lg">
        <EventSearch />
      </div>
    </div>
  );
}
