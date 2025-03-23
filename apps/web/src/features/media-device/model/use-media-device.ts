"use client"

import { useState } from "react"

type MediaDeviceState = {
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
}

type SelectedDevicesState = {
  videoDeviceId: string | null
  audioDeviceId: string | null
}

type StreamState = {
  hasAudio: boolean
  hasVideo: boolean
}

export const useMediaDevice = () => {
  const [devices, setDevices] = useState<MediaDeviceState>({
    videoDevices: [],
    audioDevices: [],
  })

  const [selectedDevices, setSelectedDevices] = useState<SelectedDevicesState>({
    videoDeviceId: "",
    audioDeviceId: "",
  })

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [streamState, setStreamState] = useState<StreamState>({
    hasVideo: false,
    hasAudio: false,
  })

  const [deviceError, setDeviceError] = useState<string | null>(null)

  const handleDeviceChange = (type: "video" | "audio", deviceId: string) => {
    setSelectedDevices(prev => ({
      ...prev,
      [type === "video" ? "videoDeviceId" : "audioDeviceId"]: deviceId,
    }))
  }

  const cleanupStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())

      setStream(null)
      setStreamState({
        hasVideo: false,
        hasAudio: false,
      })
    }
  }

  const fetchDevices = async () => {
    const isNavigatorUndefined = typeof navigator === "undefined"
    const isMediaDevicesUnavailable = !navigator?.mediaDevices

    // 예상되는 환경: 서버 렌더링 환경
    if (isNavigatorUndefined) {
      console.error("Navigator is undefined.")

      setDevices({
        videoDevices: [],
        audioDevices: [],
      })

      return
    }

    // 예상되는 환경: 브라우저 미지원 또는 비보안 컨텍스트(HTTP 등)
    if (isMediaDevicesUnavailable) {
      console.error("MediaDevices is unavailable.")

      setDevices({
        videoDevices: [],
        audioDevices: [],
      })

      return
    }

    try {
      // 미디어 장치 접근 권한 요청
      await requestMediaPermissions()
      // 미디어 장치 목록 획득
      await enumerateAndSetDevices()

    } catch (error) {
      console.error("장치 목록 가져오기 실패:", error)
    }
  }

  // 미디어 장치 접근 권한 요청
  const requestMediaPermissions = async () => {
    try {
      const isAccessibleUserMedia = !!navigator.mediaDevices?.getUserMedia

      if (isAccessibleUserMedia) {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        tempStream.getTracks().forEach(track => track.stop())
      }
    } catch (error: any) {
      console.warn("초기 미디어 접근 실패:", error)

      const isPermissionError = error.name === "NotAllowedError"
      const isDeviceNotFoundError = error.name === "NotFoundError"

      // 권한 거부 또는 장치 부재의 상황은 예상할 수 있는 에러
      if (!isPermissionError && !isDeviceNotFoundError) {
        throw error
      }
    }
  }

  /**
   * 미디어 장치 목록을 조회 및 기본 장치 자동 선택
   *
   * 1. 브라우저 API 지원 여부 확인
   * 2. 카메라/마이크 장치 목록 가져오기
   * 3. 사용자가 아직 선택하지 않은 경우 기본 장치 자동 선택
   */
  const enumerateAndSetDevices = async () => {
    const canEnumerateDevices = !!navigator.mediaDevices?.enumerateDevices

    if (!canEnumerateDevices) {
      setDeviceError("브라우저가 미디어 장치 목록 조회를 지원하지 않습니다.")

      setDevices({
        videoDevices: [],
        audioDevices: [],
      })

      return
    }

    setDeviceError(null)

    const deviceList = await navigator.mediaDevices.enumerateDevices()

    const videoDevices = deviceList.filter(device => device.kind === "videoinput")
    const audioDevices = deviceList.filter(device => device.kind === "audioinput")

    setDevices({
      videoDevices,
      audioDevices,
    })

    // 기본 비디오 장치 선택
    const hasVideoDevices = videoDevices.length > 0
    const isVideoDeviceUnselected = !selectedDevices.videoDeviceId

    if (hasVideoDevices && isVideoDeviceUnselected) {
      const firstVideoDeviceId = videoDevices[0]!.deviceId
      setSelectedDevices(prev => ({
        ...prev,
        videoDeviceId: firstVideoDeviceId,
      }))
    }

    // 기본 오디오 장치 선택
    const hasAudioDevices = audioDevices.length > 0
    const isAudioDeviceUnselected = !selectedDevices.audioDeviceId

    if (hasAudioDevices && isAudioDeviceUnselected) {
      const firstAudioDeviceId = audioDevices[0]!.deviceId
      setSelectedDevices(prev => ({
        ...prev,
        audioDeviceId: firstAudioDeviceId,
      }))
    }

  }

  // 선택한 장치를 통한 스트림 연결
  const connectStream = async () => {
    const isAccessibleUserMedia = !!navigator.mediaDevices?.getUserMedia

    if (!isAccessibleUserMedia) {
      setDeviceError("브라우저가 카메라/마이크 접근 기능을 지원하지 않습니다.")
      return
    }

    // 이전 스트림의 트랙 중지
    cleanupStream()

    try {
      const constraints = {
        video: selectedDevices.videoDeviceId
          ? { deviceId: { exact: selectedDevices.videoDeviceId } }
          : false,
        audio: selectedDevices.audioDeviceId
          ? { deviceId: { exact: selectedDevices.audioDeviceId } }
          : false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      setStreamState({
        hasVideo: newStream.getVideoTracks().length > 0,
        hasAudio: newStream.getAudioTracks().length > 0,
      })

      return newStream
    } catch (error) {
      console.error("미디어 스트림 연결 실패:", error)
      return null
    }
  }

  return {
    devices,
    selectedDevices,
    deviceError,
    stream,
    streamState,
    handleDeviceChange,
    fetchDevices,
    connectStream,
    cleanupStream
  }
}
