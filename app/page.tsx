"use client"

import { useEffect, useState } from "react"
import { Clock, Cpu, HardDrive, Server, Thermometer } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RequestFlowDiagram } from "@/components/request-flow-diagram"

// Define the server data type
interface ServerData {
  status: "online" | "warning" | "error" | "maintenance"
  errorCode?: number
  errorMessage?: string
  uptime: {
    percentage: number
    duration: string
  }
  cpu: {
    usage: number
    cores: number
    temperature: number
  }
  memory: {
    usage: number
    total: string
    used: string
  }
  temperature: {
    value: number
    status: "normal" | "warning" | "critical"
  }
  timestamp: string
}

export default function DashboardPage() {
  const [serverData, setServerData] = useState<ServerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServerData = async () => {
    try {
      const response = await fetch("/api/server-status")
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setServerData(data)
      setLoading(false)
    } catch (err) {
      setError("Failed to fetch server data")
      setLoading(false)
      console.error("Error fetching server data:", err)
    }
  }

  useEffect(() => {
    fetchServerData()

    // Set up polling for real-time updates
    const intervalId = setInterval(fetchServerData, 30000) // Update every 30 seconds

    return () => clearInterval(intervalId) // Clean up on unmount
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading server data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-destructive">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button onClick={fetchServerData} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Server className="h-6 w-6" />
          <span>ServerMonitor</span>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Last updated: {serverData ? new Date(serverData.timestamp).toLocaleTimeString() : "N/A"}
        </div>
      </header>
      <main className="flex-1 space-y-6 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Server Status</h1>
          <p className="text-destructive">
            {serverData?.errorCode} {serverData?.errorMessage} - nginx/1.24.0 (Ubuntu)
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Request Flow Visualization</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <RequestFlowDiagram status={serverData?.status || "error"} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData?.uptime.percentage}%</div>
              <div className="text-xs text-muted-foreground mb-2">Duration: {serverData?.uptime.duration}</div>
              <Progress value={serverData?.uptime.percentage} className="mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData?.cpu.usage}%</div>
              <div className="text-xs text-muted-foreground mb-2">{serverData?.cpu.cores} Cores</div>
              <Progress value={serverData?.cpu.usage} className="mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData?.memory.usage}%</div>
              <div className="text-xs text-muted-foreground mb-2">
                {serverData?.memory.used} of {serverData?.memory.total}
              </div>
              <Progress value={serverData?.memory.usage} className="mt-1" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverData?.temperature.value}°C</div>
              <div className="text-xs text-muted-foreground mb-2">Status: {serverData?.temperature.status}</div>
              <Progress
                value={((serverData?.temperature.value || 0) / 100) * 100}
                className="mt-1"
                color={
                  serverData?.temperature.status === "critical"
                    ? "red"
                    : serverData?.temperature.status === "warning"
                      ? "yellow"
                      : "green"
                }
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
