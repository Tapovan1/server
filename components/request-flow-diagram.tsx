"use client"

import { useEffect, useRef } from "react"
import { Server, Smartphone, Wifi } from "lucide-react"

interface RequestFlowDiagramProps {
  status: "online" | "warning" | "error" | "maintenance"
}

export function RequestFlowDiagram({ status }: RequestFlowDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setDimensions = () => {
      const parent = canvas.parentElement
      if (!parent) return

      canvas.width = parent.clientWidth
      canvas.height = 250
    }

    setDimensions()
    window.addEventListener("resize", setDimensions)

    // Animation variables
    let animationFrameId: number
    let particlePosition = 0

    // Draw the flow diagram
    const draw = () => {
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const width = canvas.width
      const height = canvas.height
      const centerY = height / 2

      // Calculate positions
      const padding = 60
      const availableWidth = width - padding * 2
      const step = availableWidth / 3

      const positions = [padding, padding + step, padding + step * 2, width - padding]

      // Draw connecting lines
      ctx.beginPath()
      ctx.moveTo(positions[0], centerY)
      ctx.lineTo(positions[3], centerY)
      ctx.strokeStyle = "#e2e8f0"
      ctx.lineWidth = 3
      ctx.stroke()

      // Draw error indicator if status is error
      if (status === "error" || status === "warning") {
        const errorPosition = positions[2] + (positions[3] - positions[2]) / 2

        ctx.beginPath()
        ctx.moveTo(errorPosition - 15, centerY - 15)
        ctx.lineTo(errorPosition + 15, centerY + 15)
        ctx.moveTo(errorPosition + 15, centerY - 15)
        ctx.lineTo(errorPosition - 15, centerY + 15)
        ctx.strokeStyle = status === "error" ? "#ef4444" : "#f59e0b"
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // Draw moving particle
      particlePosition = (particlePosition + 2) % (positions[3] - positions[0])

      // Only draw particle up to the error point if status is error
      const particleEndPoint = status === "error" ? positions[2] : positions[3]

      if (positions[0] + particlePosition < particleEndPoint) {
        ctx.beginPath()
        ctx.arc(positions[0] + particlePosition, centerY, 6, 0, Math.PI * 2)
        ctx.fillStyle =
          status === "online"
            ? "#10b981"
            : status === "warning"
              ? "#f59e0b"
              : status === "error"
                ? "#3b82f6"
                : "#8b5cf6"
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener("resize", setDimensions)
      cancelAnimationFrame(animationFrameId)
    }
  }, [status])

  return (
    <div className="relative h-[250px] w-full">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Icons overlay */}
      <div className="absolute inset-0 flex items-center justify-between px-[60px]">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-lg">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <span className="text-sm font-medium">User</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-lg">
            <Wifi className="h-8 w-8 text-primary" />
          </div>
          <span className="text-sm font-medium">Internet</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-lg ${status === "error" ? "border-2 border-destructive" : ""}`}
          >
            <Server className={`h-8 w-8 ${status === "error" ? "text-destructive" : "text-primary"}`} />
          </div>
          <span className={`text-sm font-medium ${status === "error" ? "text-destructive" : ""}`}>Server</span>
        </div>
      </div>

      {/* Error message */}
      {status === "error" && (
        <div className="absolute bottom-4 right-[60px] text-sm text-destructive font-medium">502 Bad Gateway</div>
      )}
    </div>
  )
}
