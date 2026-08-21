export function create24HourDateTimeFormatter(
  locales?: Intl.LocalesArgument,
  options: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat(locales, {
    ...options,
    hourCycle: "h23",
  });
}
