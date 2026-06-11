import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = dbAdmin();
  const { data: match, error } = await db
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(match);
}
