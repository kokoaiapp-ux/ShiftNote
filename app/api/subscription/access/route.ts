import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/server/billing";
import { resolveSubscriptionAccess } from "@/lib/server/subscription-access";

export async function GET(request: Request) {
  try {
    const { admin, user } = await requireApiUser(request);
    return NextResponse.json(await resolveSubscriptionAccess(admin, user.id));
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in to verify subscription access." }, { status: 401 });
    }
    return NextResponse.json({ error: "Subscription access is temporarily unavailable." }, { status: 500 });
  }
}
