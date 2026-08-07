import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/server/billing";

function dateParameter(url: URL, name: string) {
  const value = url.searchParams.get(name);
  if (!value) throw new Error("INVALID_DATE_RANGE");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE_RANGE");
  return date;
}

export async function GET(request: Request) {
  try {
    const { admin, user } = await requireApiUser(request);
    const url = new URL(request.url);
    const todayStart = dateParameter(url, "todayStart");
    const tomorrowStart = dateParameter(url, "tomorrowStart");
    const yesterdayStart = dateParameter(url, "yesterdayStart");
    const recentStart = dateParameter(url, "recentStart");
    if (!(recentStart < yesterdayStart && yesterdayStart < todayStart && todayStart < tomorrowStart)) {
      return NextResponse.json({ error: "Invalid dashboard date range." }, { status: 400 });
    }

    const assistantCount = (start: Date, end: Date) => admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "assistant")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    const [today, yesterday, recent, favorites] = await Promise.all([
      assistantCount(todayStart, tomorrowStart),
      assistantCount(yesterdayStart, todayStart),
      assistantCount(recentStart, tomorrowStart),
      admin.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const error = today.error || yesterday.error || recent.error || favorites.error;
    if (error) throw error;

    const generatedToday = today.count || 0;
    return NextResponse.json({
      generatedToday,
      generatedYesterday: yesterday.count || 0,
      timeSavedMinutes: generatedToday * 5,
      favoriteDocumentation: favorites.count || 0,
      recentActivity: recent.count || 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in to view dashboard metrics." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "INVALID_DATE_RANGE") {
      return NextResponse.json({ error: "Invalid dashboard date range." }, { status: 400 });
    }
    return NextResponse.json({ error: "Dashboard metrics are temporarily unavailable." }, { status: 500 });
  }
}
