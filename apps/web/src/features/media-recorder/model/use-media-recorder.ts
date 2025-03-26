"use client"

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"

interface MediaRecorderState {
  isRecording: boolean
  hasVideo: boolean
  hasAudio: boolean
  recordedChunks: Blob[]
  recorderError: string | null
  duration: number
  formattedDuration: string
}

interface MediaRecorderOptions {
  mimeType?: string
  videoBitsPerSecond?: number
  audioBitsPerSecond?: number
  bitsPerSecond?: number
}

export const useMediaRecorder = (
  stream: MediaStream | null,
  options: MediaRecorderOptions = {}
) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const getSupportedMimeType = useCallback(() => {
    const types = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4"
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return ""
  }, [])

  const [state, setState] = useState<MediaRecorderState>({
    isRecording: false,
    hasVideo: false,
    hasAudio: false,
    recordedChunks: [],
    recorderError: null,
    duration: 0,
    formattedDuration: "00:00",
  })

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  /**
   * 녹화 시간 업데이트
   */
  useEffect(() => {
    if (state.isRecording) {
      timerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setState(prev => ({
          ...prev,
          duration,
          formattedDuration: formatDuration(duration)
        }))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setState(prev => ({
        ...prev,
        duration: 0,
        formattedDuration: "00:00"
      }))
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [state.isRecording, formatDuration])

  // 녹화 시작
  const startRecording = useCallback(() => {
    if (!stream) {
      setState(prev => ({
        ...prev,
        recorderError: "스트림이 연결되지 않았습니다. 장치를 연결해주세요."
      }))
      return
    }

    const hasVideo = stream.getVideoTracks().length > 0
    const hasAudio = stream.getAudioTracks().length > 0

    if (!hasVideo && !hasAudio) {
      setState(prev => ({
        ...prev,
        recorderError: "녹화할 수 있는 미디어 트랙이 없습니다."
      }))
      return
    }

    try {
      const mimeType = options.mimeType || getSupportedMimeType()
      if (!mimeType) {
        setState(prev => ({
          ...prev,
          recorderError: "지원되지 않는 미디어 형식입니다."
        }))
        return
      }

      const mediaRecorder = new MediaRecorder(stream, {
        ...options,
        mimeType,
      })
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType })
        setState(prev => ({
          ...prev,
          recordedChunks: [blob],
          isRecording: false,
          isPaused: false,
          recorderError: null,
          duration: 0,
        }))
      }

      mediaRecorder.start()
      startTimeRef.current = Date.now()

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        hasVideo,
        hasAudio,
        recordedChunks: [],
        recorderError: null,
        duration: 0,
      }))
    } catch {
      setState(prev => ({
        ...prev,
        recorderError: "녹화를 시작하는 중 오류가 발생했습니다."
      }))
    }
  }, [stream, options, getSupportedMimeType])

  // 녹화 중지
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return
    }

    mediaRecorderRef.current.stop()
  }, [])

  // 녹화된 미디어 다운로드
  const handleDownload = useCallback(() => {
    if (state.recordedChunks.length === 0) {
      return
    }

    const blob = state.recordedChunks[0]
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url

    // 파일명 생성
    const date = new Date()
    const formattedDate = date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).replace(/[^0-9]/g, "")

    // MIME 타입에 따른 확장자 선택
    const extension = blob.type.includes("webm") ? "webm" : "mp4"
    a.download = `녹화_${formattedDate}.${extension}`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state.recordedChunks])

  // 녹화된 미디어 URL 획득
  const getRecordingUrl = useCallback(() => {
    if (state.recordedChunks.length === 0) {
      return null
    }

    const blob = state.recordedChunks[0]
    if (!blob) return null

    return URL.createObjectURL(blob)
  }, [state.recordedChunks])

  return {
    ...state,
    startRecording,
    stopRecording,
    handleDownload,
    getRecordingUrl,
  }
}
