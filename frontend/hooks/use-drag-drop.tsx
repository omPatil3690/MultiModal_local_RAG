"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"

interface DragDropOptions {
  onDrop: (files: File[]) => void
  accept?: string[]
  multiple?: boolean
  disabled?: boolean
}

export function useDragDrop({ onDrop, accept, multiple = true, disabled = false }: DragDropOptions) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [isDragReject, setIsDragReject] = useState(false)
  const dragCounter = useRef(0)

  const validateFiles = useCallback(
    (files: File[]) => {
      if (!accept || accept.length === 0) return files

      return files.filter((file) => {
        return accept.some((acceptedType) => {
          if (acceptedType.startsWith(".")) {
            return file.name.toLowerCase().endsWith(acceptedType.toLowerCase())
          }
          if (acceptedType.includes("/*")) {
            const [type] = acceptedType.split("/")
            return file.type.startsWith(type)
          }
          return file.type === acceptedType
        })
      })
    },
    [accept],
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounter.current++

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const files = Array.from(e.dataTransfer.items)
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)

        const validFiles = validateFiles(files)
        const hasValidFiles = validFiles.length > 0
        const hasInvalidFiles = files.length > validFiles.length

        setIsDragActive(hasValidFiles)
        setIsDragReject(hasInvalidFiles && !hasValidFiles)
      }
    },
    [disabled, validateFiles],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounter.current--

      if (dragCounter.current === 0) {
        setIsDragActive(false)
        setIsDragReject(false)
      }
    },
    [disabled],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      e.dataTransfer.dropEffect = isDragReject ? "none" : "copy"
    },
    [disabled, isDragReject],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounter.current = 0
      setIsDragActive(false)
      setIsDragReject(false)

      const files = Array.from(e.dataTransfer.files)
      const validFiles = validateFiles(files)

      if (validFiles.length > 0) {
        const filesToProcess = multiple ? validFiles : validFiles.slice(0, 1)
        onDrop(filesToProcess)
      }
    },
    [disabled, multiple, onDrop, validateFiles],
  )

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  }

  return {
    isDragActive,
    isDragReject,
    dragProps,
  }
}
