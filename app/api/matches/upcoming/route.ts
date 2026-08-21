import { NextRequest, NextResponse } from "next/server";
import { getUpcomingMatches } from "@/lib/matches/public";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;

  const matches = await getUpcomingMatches(date);

  return NextResponse.json({ matches });
}
