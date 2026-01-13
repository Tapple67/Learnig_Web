//메안 페이지
import { getUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MainPage() {
  const userId =  await getUserId();
  if (!userId) redirect("/login");

  return <h1>로그인 성공 🎉</h1>;
}
