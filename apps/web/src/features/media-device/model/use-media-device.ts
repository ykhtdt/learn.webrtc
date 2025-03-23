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

  /**
   * 디바이스 종류와 ID를 받아 선택된 디바이스 상태를 업데이트합니다.
   */
  const handleDeviceChange = (type: "video" | "audio", deviceId: string) => {
    setSelectedDevices(prev => ({
      ...prev,
      [type === "video" ? "videoDeviceId" : "audioDeviceId"]: deviceId,
    }))
  }

  /**
   * 현재 활성화된 미디어 스트림을 정리합니다.
   * 모든 트랙을 중지하고 관련 상태를 초기화합니다.
   */
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())

      setStream(null)
      setStreamState({
        hasVideo: false,
        hasAudio: false,
      })
    }
  }

  /**
   * 미디어 장치 목록을 가져옵니다.
   * 1. 환경 검사 (브라우저/서버)
   * 2. 권한 요청
   * 3. 장치 목록 조회
   */
  const fetchDevices = async () => {
    setDeviceError(null)

    const isNavigatorUndefined = typeof navigator === "undefined"
    const isMediaDevicesUnavailable = !navigator?.mediaDevices

    // 예상되는 환경: 서버 렌더링 환경
    if (isNavigatorUndefined) {
      const errorMessage = "서버 환경에서 미디어 장치에 접근할 수 없습니다."
      console.error(errorMessage)
      setDeviceError(errorMessage)
      setDevices({
        videoDevices: [],
        audioDevices: [],
      })

      return
    }

    // 예상되는 환경: 브라우저 미지원 또는 비보안 컨텍스트(HTTP 등)
    if (isMediaDevicesUnavailable) {
      const errorMessage = "브라우저가 미디어 장치 API를 지원하지 않습니다."
      console.error(errorMessage)
      setDeviceError(errorMessage)
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
      const errorMessage = "장치 목록 가져오기에 실패했습니다."
      console.error(errorMessage, error)
      setDeviceError(errorMessage)
    }
  }

  /**
   * 미디어 장치 접근 권한을 요청합니다.
   * 일시적인 스트림을 생성하여 권한을 요청한 후 즉시 해제합니다.
   */
  const requestMediaPermissions = async () => {
    const isAccessibleUserMedia = !!navigator.mediaDevices?.getUserMedia

    if (!isAccessibleUserMedia) {
      const errorMessage = "브라우저가 미디어 접근 API를 지원하지 않습니다."
      setDeviceError(errorMessage)
      throw new Error(errorMessage)
    }

    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      tempStream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      console.warn("초기 미디어 접근 실패:", error)

      const isPermissionError = error.name === "NotAllowedError"
      const isDeviceNotFoundError = error.name === "NotFoundError"

      if (isPermissionError) {
        setDeviceError("카메라 또는 마이크 접근 권한이 거부되었습니다.")
      } else if (isDeviceNotFoundError) {
        setDeviceError("카메라 또는 마이크를 찾을 수 없습니다.")
      } else {
        // 예상할 수 없는 에러는 상위로 전파
        throw error
      }
    }
  }

  /**
   * 미디어 장치 목록을 조회하고 기본 장치를 자동 선택합니다.
   * 1. 브라우저 API 지원 여부 확인
   * 2. 카메라/마이크 장치 목록 가져오기
   * 3. 사용자가 아직 선택하지 않은 경우 기본 장치 자동 선택
   */
  const enumerateAndSetDevices = async () => {
    const canEnumerateDevices = !!navigator.mediaDevices?.enumerateDevices

    if (!canEnumerateDevices) {
      const errorMessage = "브라우저가 미디어 장치 목록 조회를 지원하지 않습니다."
      setDeviceError(errorMessage)
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

  /**
   * 선택한 장치로 미디어 스트림을 연결합니다.
   * 기존 스트림은 자동으로 정리됩니다.
   */
  const connectStream = async () => {
    setDeviceError(null)
    const isAccessibleUserMedia = !!navigator.mediaDevices?.getUserMedia

    if (!isAccessibleUserMedia) {
      const errorMessage = "브라우저가 카메라/마이크 접근 기능을 지원하지 않습니다."
      setDeviceError(errorMessage)
      return
    }

    const isVideoSelected = !!selectedDevices.videoDeviceId
    const isAudioSelected = !!selectedDevices.audioDeviceId

    if (!isVideoSelected && !isAudioSelected) {
      const errorMessage = "카메라 또는 마이크를 선택해주세요. 최소 하나의 미디어 장치가 필요합니다."
      setDeviceError(errorMessage)
      return
    }

    // 이전 스트림의 트랙 중지
    stopStream()

    try {
      const constraints = {
        video: isVideoSelected
          ? { deviceId: { exact: selectedDevices.videoDeviceId! } }
          : false,
        audio: isAudioSelected
          ? { deviceId: { exact: selectedDevices.audioDeviceId! } }
          : false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      setStreamState({
        hasVideo: newStream.getVideoTracks().length > 0,
        hasAudio: newStream.getAudioTracks().length > 0,
      })

      return newStream
    } catch (error: any) {
      const errorName = error.name || "Unknown"
      let errorMessage = "미디어 스트림 연결에 실패했습니다."

      if (errorName === "NotAllowedError") {
        errorMessage = "카메라 또는 마이크 접근 권한이 거부되었습니다."
      } else if (errorName === "NotFoundError") {
        errorMessage = "선택한 카메라 또는 마이크를 찾을 수 없습니다."
      } else if (errorName === "NotReadableError") {
        errorMessage = "선택한 장치에 접근할 수 없습니다. 다른 애플리케이션이 사용 중일 수 있습니다."
      }

      console.error(errorMessage, error)
      setDeviceError(errorMessage)

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
    stopStream,
  }
}
