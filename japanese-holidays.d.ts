declare module "japanese-holidays" {
  interface JapaneseHolidaysStatic {
    getJDay(date: Date): number;
    getJHours(date: Date): number;
    getJMinutes(date: Date): number;
    isHolidayAt(date: Date, furikae?: boolean): string | undefined;
    isHoliday(date: Date, furikae?: boolean): string | undefined;
  }
  const JapaneseHolidays: JapaneseHolidaysStatic;
  export default JapaneseHolidays;
}
