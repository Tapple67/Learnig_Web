import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const AUTH_EXPIRES_IN = "3h";
const SLIDING_REFRESH_THRESHOLD_SEC = 30 * 60;

export async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload & {
      userId: string;
    };

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = typeof decoded.exp === "number" ? decoded.exp : 0;
    const remainingSec = expSec - nowSec;

    if (remainingSec > 0 && remainingSec < SLIDING_REFRESH_THRESHOLD_SEC) {
      const refreshed = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET!, {
        expiresIn: AUTH_EXPIRES_IN,
      });

      try {
        cookieStore.set("token", refreshed, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      } catch {
        // Server Component render context may not allow mutating cookies.
      }
    }

    return decoded.userId;
  } catch {
    return null;
  }
}
