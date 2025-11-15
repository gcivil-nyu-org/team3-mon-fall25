import { formatDistanceToNowStrict, format, differenceInDays } from "date-fns";

export function humanizePosted(createdAtISO) {
  if (!createdAtISO) return "";
  const d = new Date(createdAtISO);
  const days = differenceInDays(new Date(), d);
  if (days <= 30) return `${formatDistanceToNowStrict(d)} ago`;
  return `Posted ${format(d, "MMM d, yyyy")}`;
}
