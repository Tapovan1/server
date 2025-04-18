import { NextResponse } from "next/server";
import { getServerMetrics } from "@/lib/server-monitor";

export async function GET() {
  try {
    // Get real server metrics directly from the local system
    const serverData = await getServerMetrics();
    console.log("Server data:", serverData);

    return NextResponse.json(serverData);
  } catch (error) {
    console.error("Error fetching server status:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch server status",
        status: "error",
        errorCode: 500,
        errorMessage: "Internal Server Error",
        // Include some mock data so the UI doesn't break
        uptime: { percentage: 0, duration: "N/A" },
        cpu: { usage: 0, cores: 0, temperature: 0 },
        memory: { usage: 0, total: "0 GB", used: "0 GB" },
        temperature: { value: 0, status: "normal" },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
