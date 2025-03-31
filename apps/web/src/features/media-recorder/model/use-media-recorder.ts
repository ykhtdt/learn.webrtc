"use client"

import type {
  MediaRecorderState,
  MediaRecorderOptions,
} from "./types"

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"

export const useMediaRecorder = (
  stream: MediaStream | null,
  options: MediaRecorderOptions = {}
) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const previousVideoEnabledRef = useRef<boolean>(false)
  const previousAudioEnabledRef = useRef<boolean>(false)

  const getSupportedMimeType = useCallback(() => {
    const types = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4",
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/ogg;codecs=opus"
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

    const videoTrack = stream.getVideoTracks()[0]
    const audioTrack = stream.getAudioTracks()[0]

    const hasVideo = videoTrack?.enabled ?? false
    const hasAudio = audioTrack?.enabled ?? false

    if (!hasVideo && !hasAudio) {
      setState(prev => ({
        ...prev,
        recorderError: "녹화할 수 있는 미디어 트랙이 없습니다."
      }))
      return
    }

    try {
      // 오디오만 녹음하는 경우
      if (!hasVideo && hasAudio) {
        const mimeType = getSupportedMimeType()
        if (!mimeType) {
          setState(prev => ({
            ...prev,
            recorderError: "지원되지 않는 오디오 형식입니다."
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
          const blob = new Blob(chunks, { type: "audio/mp3" })
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

        // 현재 장치 상태 저장
        previousVideoEnabledRef.current = hasVideo
        previousAudioEnabledRef.current = hasAudio

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
        return
      }

      // 비디오 녹화하는 경우
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

      // 현재 장치 상태 저장
      previousVideoEnabledRef.current = hasVideo
      previousAudioEnabledRef.current = hasAudio

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

  // 장치 상태 변경 감지
  useEffect(() => {
    if (!stream || !state.isRecording) {
      return
    }

    const videoTrack = stream.getVideoTracks()[0]
    const audioTrack = stream.getAudioTracks()[0]

    const handleVideoTrackEnabled = () => {
      if (state.isRecording) {
        const isVideoEnabled = videoTrack?.enabled ?? false
        if (isVideoEnabled !== previousVideoEnabledRef.current) {
          stopRecording()
          setState(prev => ({
            ...prev,
            recorderError: "카메라 상태가 변경되어 녹화가 중지되었습니다."
          }))
        }
      }
    }

    const handleAudioTrackEnabled = () => {
      if (state.isRecording) {
        const isAudioEnabled = audioTrack?.enabled ?? false
        if (isAudioEnabled !== previousAudioEnabledRef.current) {
          stopRecording()
          setState(prev => ({
            ...prev,
            recorderError: "마이크 상태가 변경되어 녹화가 중지되었습니다."
          }))
        }
      }
    }

    videoTrack?.addEventListener("enabled", handleVideoTrackEnabled)
    audioTrack?.addEventListener("enabled", handleAudioTrackEnabled)

    return () => {
      videoTrack?.removeEventListener("enabled", handleVideoTrackEnabled)
      audioTrack?.removeEventListener("enabled", handleAudioTrackEnabled)
    }
  }, [stream, state.isRecording, stopRecording])

  // 녹화된 미디어 다운로드
  const handleDownload = useCallback(() => {
    if (state.recordedChunks.length === 0) {
      return
    }

    const blob = state.recordedChunks[0]
    if (!blob) {
      return
    }

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

    /**
     * 카메라 사용 여부에 따라 확장자를 선택합니다.
     * 1. 카메라 사용 시 비디오 녹화 파일
     * 2. 카메라 미사용 시 오디오 녹음 파일
     */
    const extension = state.hasVideo ? (blob.type.includes("webm") ? "webm" : "mp4") : "mp3"
    const prefix = state.hasVideo ? "녹화" : "녹음"
    a.download = `${prefix}_${formattedDate}.${extension}`

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state.recordedChunks, state.hasVideo])

  // 녹화된 미디어 URL 획득
  const getRecordingUrl = useCallback(() => {
    if (state.recordedChunks.length === 0) {
      return null
    }

    const blob = state.recordedChunks[0]

    if (!blob) {
      return null
    }

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
