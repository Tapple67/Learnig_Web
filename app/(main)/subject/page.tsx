
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import Combi from "./combi";




export default async function Subject() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  


  return (
    <div>
     <h1> 과목 탭 입니다</h1>
     
     <Combi />
    </div>
  );
}
