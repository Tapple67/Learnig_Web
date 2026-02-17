// 로그인 처리 API (서버)

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

const SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const token = jwt.sign(
    { userId: user.id },
    SECRET,
    { expiresIn: "1h" }
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
