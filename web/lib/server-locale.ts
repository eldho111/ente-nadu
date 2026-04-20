import { cookies } from "next/headers";

import { Locale, resolveLocale } from "@/lib/i18n";

export function getServerLocale(): Locale {
  const cookieStore = cookies();
  return resolveLocale(cookieStore.get("locale")?.value);
}
