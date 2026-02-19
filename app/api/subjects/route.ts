export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { deleteStorageObjects } from "@/lib/storage";

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


export async function DELETE(
  req: Request,
  { params }: { params: { subjectId: string } }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const subjectId = params.subjectId;

  // 내 과목인지 + 파일 키 확보(키는 지금은 대부분 null일 것)
//   const subject = await prisma.subject.findFirst({
//     where: { id: subjectId, userId },
//     include: {
//       files: { select: { storageKey: true } }, // 모델명 맞게 수정
//     },
//   });

//   if (!subject) {
//     return NextResponse.json({ error: "과목이 없거나 권한이 없습니다." }, { status: 404 });
//   }

  // null 키는 제거
//   const keys = subject.files
//     .map((f) => f.storageKey)
//     .filter((k): k is string => typeof k === "string" && k.length > 0);

  // DB 삭제 (연관은 Cascade 권장)
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subject.delete({ where: { id: subjectId } });
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DB 삭제 실패" }, { status: 500 });
  }

  // 스토리지는 지금은 NO-OP, 나중엔 실제 삭제로 바뀜
//   try {
//     await deleteStorageObjects(keys);
//   } catch (e) {
//     // 운영 관점에서 여긴 “재시도 큐/로그”로 처리하는 게 베스트
//     console.error("storage delete failed:", e);
//     // 과목 삭제는 이미 됐으니 ok=true + warning 주는 방식 추천
//     return NextResponse.json({ ok: true, warning: "파일 정리 실패(재시도 필요)" });
//   }

  return NextResponse.json({ ok: true });
}