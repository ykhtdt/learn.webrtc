"use client"

import type {
  MediaDeviceState,
  SelectedDevicesState,
  StreamState,
  PermissionState,
  PermissionStatus,
} from "./types"

import {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react"

import { ResultAsync } from "neverthrow"

export const useMediaDevice = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoadingMediaDevices, setIsLoadingMediaDevices] = useState(false)
  const [isConnectingStream, setIsConnectingStream] = useState(false)
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false)

  const [deviceError, setDeviceError] = useState<string | null>(null)

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
    isVideoEnabled: true,
    isAudioEnabled: true,
  })

  const [permissions, setPermissions] = useState<PermissionState>({
    video: "unknown",
    audio: "unknown",
  })

  const getVideoPermissionMessage = () => {
    switch (permissions.video) {
      case "granted":
        return "카메라 접근 권한이 허용되었습니다."
      case "denied":
        return "카메라 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."
      case "prompt":
        return "카메라 접근 권한을 요청합니다."
      default:
        return "카메라 접근 권한 상태를 확인할 수 없습니다."
    }
  }

  const getAudioPermissionMessage = () => {
    switch (permissions.audio) {
      case "granted":
        return "마이크 접근 권한이 허용되었습니다."
      case "denied":
        return "마이크 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."
      case "prompt":
        return "마이크 접근 권한을 요청합니다."
      default:
        return "마이크 접근 권한 상태를 확인할 수 없습니다."
    }
  }

  const isServerEnvironment = typeof navigator === "undefined"
  const isPermissionsApiUnavailable = isServerEnvironment || !navigator.permissions
  const isMediaDevicesUnavailable = isServerEnvironment || !navigator.mediaDevices
  const isEnumerateMediaDevicesUnavailable = isServerEnvironment || !navigator.mediaDevices.enumerateDevices

  useEffect(() => {
    if (isServerEnvironment) {
      setDeviceError("서버 환경에서 미디어 장치에 접근할 수 없습니다.")
      setIsInitialized(true)
      return
    }

    if (isPermissionsApiUnavailable) {
      setDeviceError("브라우저가 권한 API를 지원하지 않습니다.")
      setIsInitialized(true)
      return
    }

    if (isMediaDevicesUnavailable) {
      setDeviceError("브라우저가 미디어 장치 API를 지원하지 않습니다.")
      setIsInitialized(true)
      return
    }

    if (isEnumerateMediaDevicesUnavailable) {
      setDeviceError("브라우저가 미디어 장치 목록 조회를 지원하지 않습니다.")
      setIsInitialized(true)
      return
    }

    const initializeMediaDevices = async () => {
      // 권한 상태 확인
      await checkMediaDevicePermissions()
      // 장치 목록 조회
      await getMediaDevices()
    }

    initializeMediaDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getMediaDevicePermissionStatus = useCallback((device: "camera" | "microphone"): ResultAsync<PermissionStatus, Error> => {
    return ResultAsync.fromPromise(
      navigator.permissions.query({ name: device as PermissionName }),
      (error) => new Error(`${device === "camera" ? "카메라" : "마이크"} 권한 상태를 확인할 수 없습니다: ${error}`)
    ).map(({ state }) => state)
  }, [])

  const checkMediaDevicePermissions = useCallback(async () => {
    setIsCheckingPermissions(true)

    const [videoPermission, audioPermission] = await Promise.all([
      getMediaDevicePermissionStatus("camera"),
      getMediaDevicePermissionStatus("microphone")
    ])

    setPermissions({
      video: videoPermission.match(
        (value: PermissionStatus) => value,
        () => "unknown"
      ),
      audio: audioPermission.match(
        (value: PermissionStatus) => value,
        () => "unknown"
      )
    })

    setIsCheckingPermissions(false)
  }, [getMediaDevicePermissionStatus])

  /**
   * 미디어 장치 접근 권한을 요청합니다.
   */
  const requestMediaDevicePermissions = useCallback(async () => {
    // 1. 브라우저 권한 상태 확인 - prompt, granted, denied
    const [videoPermission, audioPermission] = await Promise.all([
      getMediaDevicePermissionStatus("camera"),
      getMediaDevicePermissionStatus("microphone")
    ])

    if (videoPermission.isOk() && audioPermission.isOk()) {
      if (videoPermission.value === "denied" || audioPermission.value === "denied") {
        const errorMessage = "카메라 또는 마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."
        setDeviceError(errorMessage)
        return
      }
    }

    // 2. 브라우저에서 장치 권한이 모두 허용되어있다면, 미디어 스트림 요청 (권한 UI 표시 및 장치 액세스 테스트)
    const requestMediaStream = await ResultAsync.fromPromise(
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
      (error) => new Error(`미디어 스트림 요청에 실패했습니다. ${error}`)
    )

    // 2-1. 스트림 요청 성공 시 - 브라우저 및 OS 모두 권한이 허용됨, 리소스 해제 후 종료
    if (requestMediaStream.isOk()) {
      requestMediaStream.value.getTracks().forEach(track => track.stop())
      return
    }

    // 2-2. 스트림 요청 실패 시 - 브라우저 권한 상태 재확인
    const [newVideoPermission, newAudioPermission] = await Promise.all([
      getMediaDevicePermissionStatus("camera"),
      getMediaDevicePermissionStatus("microphone")
    ])

    if (newVideoPermission.isOk() && newAudioPermission.isOk()) {
      // prompt -> denied or denied의 경우
      let errorMessage = "카메라 또는 마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."

      // 브라우저 설정에서 권한이 허용되었지만 OS에서 차단된 경우
      if (newVideoPermission.value === "granted" || newAudioPermission.value === "granted") {
        errorMessage = "카메라 또는 마이크가 시스템에서 비활성화되어 있습니다. 시스템 설정에서 장치를 활성화해주세요."
      }

      setDeviceError(errorMessage)
    }
  }, [getMediaDevicePermissionStatus])

  /**
   * 미디어 장치 목록을 조회하고 기본 장치를 자동 선택합니다.
   * 1. 브라우저 API 지원 여부 확인
   * 2. 카메라/마이크 장치 목록 가져오기
   * 3. 사용자가 아직 선택하지 않은 경우 기본 장치 자동 선택
   */
  const enumerateMediaDevices = useCallback(async () => {
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
  }, [selectedDevices])

  /**
   * 미디어 장치 목록을 가져옵니다.
   */
  const getMediaDevices = useCallback(async () => {
    setIsLoadingMediaDevices(true)

    // 권한 요청
    const permissionResult = await ResultAsync.fromPromise(
      requestMediaDevicePermissions(),
      (error) => error
    )

    // 권한 요청이 성공한 경우 권한 상태를 업데이트 후, 장치 목록 조회
    if (permissionResult.isOk()) {
      await checkMediaDevicePermissions()
      await enumerateMediaDevices()
    }

    setIsInitialized(true)
    setIsLoadingMediaDevices(false)
  }, [checkMediaDevicePermissions, requestMediaDevicePermissions, enumerateMediaDevices])


  /**
   * 디바이스 종류와 ID를 받아 선택된 디바이스 상태를 업데이트합니다.
   */
  const handleDeviceChange = useCallback((type: "video" | "audio", deviceId: string) => {
    setSelectedDevices(prev => ({
      ...prev,
      [type === "video" ? "videoDeviceId" : "audioDeviceId"]: deviceId,
    }))
  }, [])

  /**
   * 현재 활성화된 미디어 스트림을 정리합니다.
   * 모든 트랙을 중지하고 관련 상태를 초기화합니다.
   */
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())

      setStream(null)
      setStreamState({
        hasVideo: false,
        hasAudio: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
      })
    }
  }, [stream])

  useEffect(() => {
    // 장치가 변경되었을 때 장치 목록 갱신
    const handleDeviceListChange = () => {
      if (isInitialized) {
        enumerateMediaDevices()
      }
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceListChange)

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceListChange)
    }
  }, [isInitialized, enumerateMediaDevices])

  /**
   * 비디오 요소 참조를 설정
   */
  const setVideoRef = (ref: HTMLVideoElement | null) => {
    videoRef.current = ref

    const isVideoStreamReady = ref && stream

    if (isVideoStreamReady) {
      ref.srcObject = stream
    }
  }

  /**
   * 선택한 장치로 미디어 스트림을 연결합니다.
   * 기존 스트림은 자동으로 정리됩니다.
   */
  const connectStream = async () => {
    setDeviceError(null)
    setIsConnectingStream(true)

    if (isMediaDevicesUnavailable || !navigator.mediaDevices.getUserMedia) {
      const errorMessage = "브라우저가 카메라/마이크 접근 기능을 지원하지 않습니다."
      setDeviceError(errorMessage)
      setIsConnectingStream(false)
      return
    }

    const isVideoSelected = !!selectedDevices.videoDeviceId
    const isAudioSelected = !!selectedDevices.audioDeviceId

    if (!isVideoSelected && !isAudioSelected) {
      const errorMessage = "카메라 또는 마이크를 선택해주세요. 최소 하나의 미디어 장치가 필요합니다."
      setDeviceError(errorMessage)
      setIsConnectingStream(false)
      return
    }

    // 이전 스트림의 트랙 중지
    stopStream()

    try {
      // 초기 미디어 접근 권한 요청
      await requestMediaDevicePermissions()

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
        isVideoEnabled: true,
        isAudioEnabled: true,
      })

      // 비디오 요소가 있는 경우 스트림 연결
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }

      return newStream
    } catch (error: any) {
      const errorName = error.name || "Unknown"
      let errorMessage = "미디어 스트림 연결에 실패했습니다."

      if (errorName === "NotAllowedError") {
        errorMessage = "카메라 또는 마이크 접근 권한이 거부되었습니다."
      } else if (errorName === "NotFoundError") {
        errorMessage = "선택한 카메라 또는 마이크를 찾을 수 없습니다."
      } else if (errorName === "NotReadableError") {
        const device = isVideoSelected ? "카메라" : "마이크"
        errorMessage = `${device}가 시스템에서 비활성화되어 있습니다. 시스템 설정에서 ${device}를 활성화해주세요.`
      } else if (errorName === "TrackStartError") {
        const device = isVideoSelected ? "카메라" : "마이크"
        errorMessage = `${device}를 시작할 수 없습니다. 시스템 설정에서 ${device}가 활성화되어 있는지 확인해주세요.`
      }

      if (!deviceError) {
        console.warn(errorMessage, error)
        setDeviceError(errorMessage)
      }

      // 에러 발생 시 스트림 상태 초기화
      setStream(null)
      setStreamState({
        hasVideo: false,
        hasAudio: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
      })

      return null
    } finally {
      setIsConnectingStream(false)
    }
  }

  /**
   * 비디오 트랙을 켜거나 끕니다.
   */
  const toggleVideo = () => {
    if (!stream) {
      return
    }

    const videoTracks = stream.getVideoTracks()
    const hasVideoTracks = videoTracks.length > 0

    if (!hasVideoTracks) {
      return
    }

    const firstTrack = videoTracks[0]
    const isCurrentlyEnabled = firstTrack ? firstTrack.enabled : false

    videoTracks.forEach(track => {
      track.enabled = !isCurrentlyEnabled
    })

    setStreamState(prev => ({
      ...prev,
      isVideoEnabled: !isCurrentlyEnabled
    }))
  }

  /**
   * 오디오 트랙을 켜거나 끕니다.
   */
  const toggleAudio = () => {
    if (!stream) {
      return
    }

    const audioTracks = stream.getAudioTracks()
    const hasAudioTracks = audioTracks.length > 0

    if (!hasAudioTracks) {
      return
    }

    const firstTrack = audioTracks[0]
    const isCurrentlyEnabled = firstTrack ? firstTrack.enabled : false

    audioTracks.forEach(track => {
      track.enabled = !isCurrentlyEnabled
    })

    setStreamState(prev => ({
      ...prev,
      isAudioEnabled: !isCurrentlyEnabled
    }))
  }

  /**
   * 비디오 장치 연결을 해제합니다.
   */
  const disconnectVideo = () => {
    if (!stream) {
      return
    }

    const videoTracks = stream.getVideoTracks()
    videoTracks.forEach(track => track.stop())

    setStreamState(prev => ({
      ...prev,
      hasVideo: false,
      isVideoEnabled: false
    }))

    // 비디오 트랙이 모두 제거된 경우 스트림도 정리
    if (stream.getTracks().length === 0) {
      stopStream()
    }
  }

  /**
   * 오디오 장치 연결을 해제합니다.
   */
  const disconnectAudio = () => {
    if (!stream) {
      return
    }

    const audioTracks = stream.getAudioTracks()
    audioTracks.forEach(track => track.stop())

    setStreamState(prev => ({
      ...prev,
      hasAudio: false,
      isAudioEnabled: false
    }))

    // 오디오 트랙이 모두 제거된 경우 스트림도 정리
    if (stream.getTracks().length === 0) {
      stopStream()
    }
  }

  // 스트림이 변경될 때 비디오 요소에 연결
  useEffect(() => {
    if (videoRef.current) {
      const isVideoStreamReady = videoRef.current && stream

      if (isVideoStreamReady) {
        videoRef.current.srcObject = stream
      }
    }
  }, [stream])

  return {
    isInitialized,
    isCheckingPermissions,
    isLoadingMediaDevices,
    isConnectingStream,
    permissions,
    devices,
    selectedDevices,
    handleDeviceChange,
    stream,
    streamState,
    connectStream,
    setVideoRef,
    toggleVideo,
    toggleAudio,
    getVideoPermissionMessage,
    getAudioPermissionMessage,
    deviceError,
    disconnectVideo,
    disconnectAudio,
  }
}
