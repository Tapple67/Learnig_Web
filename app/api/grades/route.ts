export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";


export async function GET() {
    const userId = await getUserId();       // 로그인 사용자 확인

    if(!userId) {           // 확인 안되면 에러
        return NextResponse.json({ error: "권한이 없습니다. 로그인하세요" }, { status: 401 });
    }
    
    
    const grades = await prisma.grade.findMany({
    where: { userId },                 //현재 사용자의 학기
      orderBy: [
        { year: "asc" },
        { term: "asc" },
      ]
        });

    return NextResponse.json(grades);
}