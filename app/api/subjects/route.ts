export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET(req : Request) {
    const userId = await getUserId();       // 로그인 사용자 확인
    

    if(!userId) {           // 확인 안되면 에러
        return NextResponse.json({ error: "권한이 없습니다. 로그인하세요" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const gradeId = searchParams.get("gradeId");
    
    if (!gradeId) {
        return NextResponse.json({ error: "학기 선택이 필요합니다" }, { status: 400 });
    }


    const subjects = await prisma.subject.findMany({
    where: {
        gradeId,
        grade:{
            userId,
        },
    },              
    orderBy: {createdAt: "desc"},       //최신순으로 생성한 과목 정렬 해서 가져오기
        });

    return NextResponse.json(subjects);
}

export async function POST(req: Request) {
    const userId = await getUserId();

    if(!userId){
        return NextResponse.json({ error: "권한이 없습니다 로그인하세요" } , { status: 401 });
    } 
    
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const gradeId = String(body?.gradeId ?? "").trim();
     

   if (name.length < 1 || name.length > 50) {
    return NextResponse.json({ error: "과목명은 1~50자여야 합니다." }, { status: 400 });
  }

  if (!gradeId) {
    return NextResponse.json({ error: "학기 정보가 필요합니다." }, { status: 400 });
  }


    const grade = await prisma.grade.findFirst({
    where: { id: gradeId, userId },
    select: { id: true }, });
  
  if (!grade) {
    return NextResponse.json({ error: "유효하지 않은 학기입니다." }, { status: 403 });
  }

   const subject = await prisma.subject.create({
    data: {
        gradeId: grade.id, name },
  });

    revalidatePath("/subjects"); 
    return NextResponse.json({ subject }, { status: 201 });


}