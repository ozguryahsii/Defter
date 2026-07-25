import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFxRate } from "@/lib/fx";
import { isCurrencyCode } from "@/lib/currencies";

export const dynamic = "force-dynamic";

/** GET /api/fx?from=EUR&to=TRY → { rate, asOf } */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isCurrencyCode(from) || !isCurrencyCode(to))
    return new NextResponse("Bad request", { status: 400 });

  const fx = await getFxRate(from, to);
  if (!fx)
    return NextResponse.json(
      { error: "Kur şu anda alınamıyor." },
      { status: 503 },
    );
  return NextResponse.json({ rate: fx.rate, asOf: fx.asOf.toISOString() });
}
