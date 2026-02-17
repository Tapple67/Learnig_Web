//회원 가입처리 API(서버)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "입력 누락" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "이미 존재하는 이메일" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction(async(tx) => {
    const user = await tx.user.create({
      data: { email, password: hashed },
    });
  
    await tx.grade.createMany({
      data : Array.from({ length: 6 }, (_, i) => 
        [1, 2].map((term) => ({
        userId: user.id,
        year:i+1,
        term,
        isCurrent: i === 0 && term ===1,
      })),
      ).flat(),
    });

    return user;

    });

  return NextResponse.json({ ok: true });
}
