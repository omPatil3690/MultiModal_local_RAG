"use client"

import type React from "react"
import { useDragDrop } from "@/hooks/use-drag-drop"
import { DragDropOverlay } from "@/components/drag-drop-overlay"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, ImageIcon, FileText, X, Play, Pause, Square, Upload } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface AudioRecording {
  id: string
  blob: Blob
  duration: number
  url: string
}

interface ImageAttachment {
  id: string
  file: File
  url: string
  preview: string
}

interface FileAttachment {
  id: string
  file: File
}

interface MultimodalInputProps {
  onAudioRecorded: (audio: AudioRecording) => void
  onImageAttached: (image: ImageAttachment) => void
  onFileAttached: (file: FileAttachment) => void
}

export function MultimodalInput({ onAudioRecorded, onImageAttached, onFileAttached }: MultimodalInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([])
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      source.connect(analyser)
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      mediaRecorderRef.current = mediaRecorder
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        const recording: AudioRecording = {
          id: Date.now().toString(),
          blob,
          duration: recordingTime,
          url,
        }
        setCurrentRecording(recording)
        onAudioRecorded(recording)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Audio level monitoring
      const updateAudioLevel = () => {
        if (analyser) {
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / bufferLength
          setAudioLevel(average / 255)
        }
      }

      // Timer and audio level updates
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
        updateAudioLevel()
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }, [recordingTime, onAudioRecorded])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setAudioLevel(0)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isRecording])

  const playRecording = () => {
    if (currentRecording && !isPlaying) {
      const audio = new Audio(currentRecording.url)
      audioRef.current = audio
      audio.play()
      setIsPlaying(true)
      audio.onended = () => {
        setIsPlaying(false)
      }
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const deleteRecording = () => {
    if (currentRecording) {
      URL.revokeObjectURL(currentRecording.url)
      setCurrentRecording(null)
    }
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file)
        const image: ImageAttachment = {
          id: Date.now().toString() + Math.random(),
          file,
          url,
          preview: url,
        }
        setAttachedImages((prev) => [...prev, image])
        onImageAttached(image)
      }
    })
  }

  const removeImage = (id: string) => {
    setAttachedImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.url)
      }
      return prev.filter((img) => img.id !== id)
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const fileAttachment: FileAttachment = {
        id: Date.now().toString(),
        file,
      }
      setAttachedFiles((prev) => [...prev, fileAttachment])
      onFileAttached(fileAttachment)
    }
  }

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const {
    isDragActive: isImageDragActive,
    isDragReject: isImageDragReject,
    dragProps: imageDragProps,
  } = useDragDrop({
    onDrop: (files) => {
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          const url = URL.createObjectURL(file)
          const image: ImageAttachment = {
            id: Date.now().toString() + Math.random(),
            file,
            url,
            preview: url,
          }
          setAttachedImages((prev) => [...prev, image])
          onImageAttached(image)
        }
      })
    },
    accept: ["image/*"],
    multiple: true,
  })

  const {
    isDragActive: isFileDragActive,
    isDragReject: isFileDragReject,
    dragProps: fileDragProps,
  } = useDragDrop({
    onDrop: (files) => {
      files.forEach((file) => {
        const fileAttachment: FileAttachment = {
          id: Date.now().toString(),
          file,
        }
        setAttachedFiles((prev) => [...prev, fileAttachment])
        onFileAttached(fileAttachment)
      })
    },
    accept: [".pdf", ".txt", ".doc", ".docx"],
    multiple: true,
  })

  return (
    <div className="max-h-80 overflow-hidden">
      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-3">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-3 w-3" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="h-3 w-3" />
            Images
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            Files
          </TabsTrigger>
        </TabsList>

        {/* Voice Tab */}
        <TabsContent value="voice" className="mt-0">
          <Card className="border-dashed">
            <CardContent className="p-3">
              {/* Recording Controls */}
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  className="flex-shrink-0"
                >
                  {isRecording ? <Square className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
                  {isRecording ? "Stop" : "Record"}
                </Button>

                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse text-xs">
                    {formatTime(recordingTime)}
                  </Badge>
                )}
              </div>

              {/* Audio Level Indicator */}
              {isRecording && (
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 w-1 rounded-full transition-colors ${
                        i < audioLevel * 15 ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Current Recording Playback */}
              <AnimatePresence>
                {currentRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-2 bg-muted rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={playRecording} className="h-6 w-6 p-0">
                        {isPlaying ? <Pause className="h-2 w-2" /> : <Play className="h-2 w-2" />}
                      </Button>
                      <span className="text-xs">Recording ({formatTime(currentRecording.duration)})</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={deleteRecording} className="h-6 w-6 p-0">
                      <X className="h-2 w-2" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="mt-0">
          <Card className="border-dashed relative" {...imageDragProps}>
            <DragDropOverlay
              isActive={isImageDragActive}
              isReject={isImageDragReject}
              message="Drop images here"
              acceptedTypes={["image/*"]}
            />

            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Image Analysis</span>
                <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {/* Attached Images */}
              <div className="max-h-32 overflow-y-auto">
                <AnimatePresence>
                  {attachedImages.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-3 gap-2"
                    >
                      {attachedImages.map((image) => (
                        <motion.div
                          key={image.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative group"
                        >
                          <img
                            src={image.preview || "/placeholder.svg"}
                            alt="Attached"
                            className="w-full h-16 object-cover rounded border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage(image.id)}
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2 w-2" />
                          </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b truncate">
                            {image.file.name}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="text-center py-3 text-muted-foreground">
                      <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Drop images or click Add</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-0">
          <Card className="border-dashed relative" {...fileDragProps}>
            <DragDropOverlay
              isActive={isFileDragActive}
              isReject={isFileDragReject}
              message="Drop documents here"
              acceptedTypes={[".pdf", ".txt", ".doc"]}
            />

            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Document Context</span>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />
                  Attach
                </Button>
              </div>

              {/* Attached Files */}
              <div className="max-h-32 overflow-y-auto">
                <AnimatePresence>
                  {attachedFiles.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      {attachedFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between p-2 bg-muted rounded border group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span className="text-xs truncate">{file.file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="text-center py-3 text-muted-foreground">
                      <FileText className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Drop documents or click Attach</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
