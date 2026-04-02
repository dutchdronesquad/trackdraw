import { getAuth } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    return await (await getAuth()).handler(request);
  } catch (error) {
    console.error("[TrackDraw auth][GET]", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    return await (await getAuth()).handler(request);
  } catch (error) {
    console.error("[TrackDraw auth][POST]", error);
    throw error;
  }
}
