import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exports a group's expenses as a UTF-8 CSV (opens directly in Excel).
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const group = await prisma.group.findFirst({
    where: { id: params.id, members: { some: { userId: session.user.id } } },
    include: {
      expenses: {
        orderBy: { date: "asc" },
        include: { payer: true, shares: { include: { user: true } } },
      },
    },
  });
  if (!group) return new NextResponse("Not found", { status: 404 });

  const header = [
    "Tarih",
    "Açıklama",
    "Kategori",
    "Ödeyen",
    "Tutar",
    "Para Birimi",
    "Katılımcılar",
    "Bölüşüm",
  ];
  const rows = group.expenses.map((e) => [
    new Date(e.date).toISOString().slice(0, 10),
    e.description,
    e.category ?? "",
    e.payer.displayName ?? e.payer.username,
    e.amount.toFixed(2),
    group.currency,
    e.shares
      .map((s) => `${s.user.displayName ?? s.user.username}:${s.amount.toFixed(2)}`)
      .join(" | "),
    e.splitType,
  ]);

  const csv =
    "﻿" + // BOM so Excel detects UTF-8 (Turkish characters)
    [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");

  const safeName = group.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="defter_${safeName}.csv"`,
    },
  });
}
