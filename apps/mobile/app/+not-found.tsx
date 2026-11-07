import { Redirect, usePathname } from "expo-router";

import { toInAppHref } from "@/lib/navigation";

/** Catches old universal links to the pre-rework routes and sends them to the canonical place. */
export default function NotFound() {
  const pathname = usePathname();
  const canonical = toInAppHref(pathname);
  if (canonical && canonical !== pathname) {
    return <Redirect href={canonical} />;
  }
  return <Redirect href="/" />;
}
