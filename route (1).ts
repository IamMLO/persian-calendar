import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const task = updateTask(id, {
    title: body.title,
    note: body.note,
    scheduled: body.scheduled,
    date: body.date,
    startMinutes: body.startMinutes,
    durationMinutes: body.durationMinutes,
    reminderMinutesBefore: body.reminderMinutesBefore,
    reminderFired: body.reminderFired,
    color: body.color,
  });

  if (!task) {
    return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteTask(id);
  if (!ok) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
