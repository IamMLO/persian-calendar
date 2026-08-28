import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const tasks = listTasks();
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title الزامی است" }, { status: 400 });
  }

  const task = createTask({
    title: body.title,
    note: body.note ?? null,
    scheduled: Boolean(body.scheduled),
    date: body.date ?? null,
    startMinutes: body.startMinutes ?? null,
    durationMinutes: body.durationMinutes ?? 60,
    reminderMinutesBefore: body.reminderMinutesBefore ?? null,
    color: body.color ?? "violet",
  });

  return NextResponse.json({ task }, { status: 201 });
}
