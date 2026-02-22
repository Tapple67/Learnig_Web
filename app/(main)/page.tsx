//메인 페이지
import { getUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Current_Grade from "./_blocks/current_grade";
import Recent_Activity from "./_blocks/recent_activity";

export default async function MainPage() {
  const userId =  await getUserId();
  if (!userId) redirect("/login");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Current_Grade />
        <Recent_Activity/>
      </div>

    </div>
  );
}
