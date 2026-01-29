"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, FileText, ImageIcon, Mic } from "lucide-react"

interface DragDropOverlayProps {
  isActive: boolean
  isReject: boolean
  message?: string
  acceptedTypes?: string[]
}

export function DragDropOverlay({ isActive, isReject, message, acceptedTypes }: DragDropOverlayProps) {
  const getIcon = () => {
    if (isReject) return <X className="h-16 w-16 text-red-500" />
    return <Upload className="h-16 w-16 text-primary" />
  }

  const getMessage = () => {
    if (isReject) return "File type not supported"
    if (message) return message
    return "Drop files here to upload"
  }

  const getAcceptedTypesIcons = () => {
    if (!acceptedTypes) return null

    const icons = []
    if (acceptedTypes.some((type) => type.includes("pdf") || type.includes("text"))) {
      icons.push(<FileText key="pdf" className="h-8 w-8 text-red-500" />)
    }
    if (acceptedTypes.some((type) => type.includes("image"))) {
      icons.push(<ImageIcon key="image" className="h-8 w-8 text-blue-500" />)
    }
    if (acceptedTypes.some((type) => type.includes("audio"))) {
      icons.push(<Mic key="audio" className="h-8 w-8 text-green-500" />)
    }

    return icons.length > 0 ? <div className="flex gap-4 mt-4 opacity-70">{icons}</div> : null
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className={`
              flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed
              ${
                isReject
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : "border-primary bg-primary/5 dark:bg-primary/10"
              }
            `}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: isReject ? [0, -10, 10, -10, 0] : [0, 5, -5, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            >
              {getIcon()}
            </motion.div>
            <h2 className={`text-2xl font-bold mt-4 ${isReject ? "text-red-600" : "text-foreground"}`}>
              {getMessage()}
            </h2>
            {getAcceptedTypesIcons()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
