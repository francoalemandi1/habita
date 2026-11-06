/** §5.3 Avisos — relative time shown under each "Novedades" entry. */
export function formatNotificationTime(dateString: string, now: Date = new Date()): string {
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = past.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hoy ${timeStr}`;
  if (diffDays === 1) return `ayer ${timeStr}`;
  if (diffDays < 7) {
    const dayName = past.toLocaleDateString("es", { weekday: "long" });
    return `${dayName} ${timeStr}`;
  }
  return `${past.toLocaleDateString("es", { day: "numeric", month: "short" })} ${timeStr}`;
}
