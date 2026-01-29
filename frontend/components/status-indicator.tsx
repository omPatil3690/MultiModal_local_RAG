"use client"

import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from "lucide-react"

interface StatusIndicatorProps {
  status: "online" | "offline" | "processing" | "success" | "error"
  message?: string
  className?: string
}

export function StatusIndicator({ status, message, className = "" }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "online":
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          message: message || "Connected",
        }
      case "offline":
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          message: message || "Disconnected",
        }
      case "processing":
        return {
          icon: <Clock className="h-4 w-4 animate-spin" />,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          message: message || "Processing...",
        }
      case "success":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          message: message || "Success",
        }
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          message: message || "Error",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${className}`}
    >
      <span className={config.color}>{config.icon}</span>
      <span className={`text-sm font-medium ${config.color}`}>{config.message}</span>
    </motion.div>
  )
}
