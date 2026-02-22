//로그인 상태 확인 (서버)

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function getUserId() {
  const cookieStore = await cookies(); 
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    return decoded.userId;
  } catch {
    return null;
  }
}
 