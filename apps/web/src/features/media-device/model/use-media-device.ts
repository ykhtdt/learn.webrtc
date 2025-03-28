"use client"

import {
  useEffect,
  useState,
  useRef,
} from "react"

interface MediaDeviceState {
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
}

interface SelectedDevicesState {
  videoDeviceId: string | null
  audioDeviceId: string | null
}

interface StreamState {
  hasAudio: boolean
  hasVideo: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
}

type PermissionStatus = "granted" | "denied" | "prompt" | "unknown"

interface PermissionState {
  video: PermissionStatus
  audio: PermissionStatus
}

export const useMediaDevice = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const [isConnectingStream, setIsConnectingStream] = useState(false)
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false)
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false)
  const [previousPermissions, setPreviousPermissions] = useState<PermissionState>({
    video: "unknown",
    audio: "unknown"
  })
  const [hasPermissionChanged, setHasPermissionChanged] = useState(false)

  const [environmentError, setEnvironmentError] = useState<string | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const isServerEnvironment = () => typeof navigator === "undefined"
  const isMediaDevicesUnavailable = () => isServerEnvironment() || !navigator.mediaDevices
  const isPermissionsApiUnavailable = () => isServerEnvironment() || !navigator.permissions

  const handleEnvironmentLimitation = (errorMessage: string) => {
    console.warn(errorMessage)
    setDeviceError(errorMessage)
    setDevices({
      videoDevices: [],
      audioDevices: [],
    })
    setIsInitialized(true)
    setIsLoadingDevices(false)
  }

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

  const checkDevicePermission = async (device: "camera" | "microphone"): Promise<PermissionStatus> => {
    try {
      const { state } = await navigator.permissions.query({ name: device as PermissionName })
      return state
    } catch (error) {
      console.warn(`${device === "camera" ? "카메라" : "마이크"} 권한 상태를 확인할 수 없습니다:`, error)
      return "unknown"
    }
  }

  const checkPermissions = async () => {
    if (isServerEnvironment() || isPermissionsApiUnavailable()) {
      setPermissions({
        video: "unknown",
        audio: "unknown"
      })
      return
    }

    setIsCheckingPermissions(true)

    try {
      const [videoPermission, audioPermission] = await Promise.all([
        checkDevicePermission("camera"),
        checkDevicePermission("microphone")
      ])

      setPermissions({
        video: videoPermission,
        audio: audioPermission,
      })
    } finally {
      setIsCheckingPermissions(false)
    }
  }

  /**
   * 미디어 장치 초기화
   * 1. 권한 상태 확인
   * 2. 장치 목록 조회
   */
  const initializeMediaDevices = async () => {
    await checkPermissions()
    await getMediaDevices()
  }

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
        isVideoEnabled: true,
        isAudioEnabled: true,
      })
    }
  }

  /**
   * 미디어 장치 목록을 가져옵니다.
   * 1. 환경 검사 (브라우저/서버)
   * 2. 권한 요청
   * 3. 장치 목록 조회
   */
  const getMediaDevices = async () => {
    setDeviceError(null)
    setIsLoadingDevices(true)

    const isNavigatorUndefined = typeof navigator === "undefined"
    const isMediaDevicesUnavailable = !navigator?.mediaDevices

    // 예상되는 환경: 서버 렌더링 환경
    if (isNavigatorUndefined) {
      const errorMessage = "서버 환경에서 미디어 장치에 접근할 수 없습니다."
      console.warn(errorMessage)
      setDeviceError(errorMessage)
      setDevices({
        videoDevices: [],
        audioDevices: [],
      })
      setIsInitialized(true)
      setIsLoadingDevices(false)
      return
    }

    // 예상되는 환경: 브라우저 미지원 또는 비보안 컨텍스트(HTTP 등)
    if (isMediaDevicesUnavailable) {
      const errorMessage = "브라우저가 미디어 장치 API를 지원하지 않습니다."
      console.warn(errorMessage)
      setDeviceError(errorMessage)
      setDevices({
        videoDevices: [],
        audioDevices: [],
      })
      setIsInitialized(true)
      setIsLoadingDevices(false)
      return
    }

    try {
      // 미디어 장치 접근 권한 요청
      await requestMediaPermissions()
      // 권한 요청이 성공한 경우에 장치 목록 획득
      await enumerateAndSetDevices()
      setIsInitialized(true)
    } catch {
      setIsInitialized(true)
    } finally {
      setIsLoadingDevices(false)
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
      // 현재 권한 상태 확인
      const [videoPermission, audioPermission] = await Promise.all([
        navigator.permissions.query({ name: "camera" as PermissionName }),
        navigator.permissions.query({ name: "microphone" as PermissionName })
      ])

      // 권한 상태 즉시 업데이트
      setPermissions({
        video: videoPermission.state,
        audio: audioPermission.state,
      })

      /**
       * 권한이 이미 허용된 경우
       * 임시 미디어 스트림을 생성하여, 실제 장치에 접근할 수 있는지 테스트를 진행한다.
       * 이후, 모든 트랙을 중지하여 리소스를 해제한다.
       */
      if (videoPermission.state === "granted" && audioPermission.state === "granted") {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        tempStream.getTracks().forEach(track => track.stop())
        return
      }

      // 권한이 거부되었거나 prompt 상태인 경우
      // getUserMedia를 호출하여 브라우저의 권한 요청 UI를 표시
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        tempStream.getTracks().forEach(track => track.stop())
      } catch (error: any) {
        // getUserMedia 호출 실패 시 권한 상태 다시 확인
        const [newVideoPermission, newAudioPermission] = await Promise.all([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName })
        ])

        // 권한 상태 즉시 업데이트
        setPermissions({
          video: newVideoPermission.state,
          audio: newAudioPermission.state,
        })

        // 권한이 여전히 거부된 경우
        if (newVideoPermission.state === "denied" || newAudioPermission.state === "denied") {
          throw new Error("PERMISSION_DENIED")
          // setDeviceError("카메라 또는 마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.")
        }
        throw error
      }
    } catch (error: any) {
      console.warn("미디어 접근 실패:", error)

      const errorName = error.name || "Unknown"
      let errorMessage = "미디어 장치 접근에 실패했습니다."

      if (errorName === "NotAllowedError" || error.message === "PERMISSION_DENIED") {
        try {
          const [videoPermission, audioPermission] = await Promise.all([
            navigator.permissions.query({ name: "camera" as PermissionName }),
            navigator.permissions.query({ name: "microphone" as PermissionName })
          ])

          // 권한 상태 즉시 업데이트
          setPermissions({
            video: videoPermission.state,
            audio: audioPermission.state,
          })

          // 브라우저 설정에서 권한이 허용되었지만 OS에서 차단된 경우
          if (videoPermission.state === "granted" || audioPermission.state === "granted") {
            errorMessage = "카메라 또는 마이크가 시스템에서 비활성화되어 있습니다. 시스템 설정에서 장치를 활성화해주세요."
          } else {
            // 브라우저 설정에서 권한이 거부된 경우
            errorMessage = "카메라 또는 마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."
          }
        } catch {
          errorMessage = "카메라 또는 마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요."
        }
      } else if (errorName === "NotFoundError") {
        errorMessage = "카메라 또는 마이크를 찾을 수 없습니다."
      } else if (errorName === "NotReadableError") {
        errorMessage = "카메라 또는 마이크가 시스템에서 비활성화되어 있습니다. 시스템 설정에서 장치를 활성화해주세요."
      } else if (errorName === "TrackStartError") {
        errorMessage = "카메라 또는 마이크를 시작할 수 없습니다. 시스템 설정에서 장치가 활성화되어 있는지 확인해주세요."
      }

      setDeviceError(errorMessage)
      throw error
    }
  }

  /**
   * 미디어 장치 목록을 조회하고 기본 장치를 자동 선택합니다.
   * 1. 브라우저 API 지원 여부 확인
   * 2. 카메라/마이크 장치 목록 가져오기
   * 3. 사용자가 아직 선택하지 않은 경우 기본 장치 자동 선택
   */
  const enumerateAndSetDevices = async () => {
    if (isMediaDevicesUnavailable() || !navigator.mediaDevices.enumerateDevices) {
      const errorMessage = "브라우저가 미디어 장치 목록 조회를 지원하지 않습니다."
      setDeviceError(errorMessage)
      setDevices({
        videoDevices: [],
        audioDevices: [],
      })
      return
    }

    if (!deviceError) {
      setDeviceError(null)
    }

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

  useEffect(() => {
    // 예상되는 환경: 서버 렌더링 환경
    if (isServerEnvironment()) {
      handleEnvironmentLimitation("서버 환경에서 미디어 장치에 접근할 수 없습니다.")
      return
    }

    // 예상되는 환경: 브라우저 미지원 또는 비보안 컨텍스트(HTTP 등)
    if (isMediaDevicesUnavailable()) {
      handleEnvironmentLimitation("브라우저가 미디어 장치 API를 지원하지 않습니다.")
      return
    }

    // 장치가 변경되었을 때 장치 목록 갱신
    const handleDeviceChange = () => {
      if (isInitialized) {
        enumerateAndSetDevices()
      }
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [isInitialized, enumerateAndSetDevices])

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
    setHasRequestedPermission(true)
    setPreviousPermissions(permissions)

    if (isMediaDevicesUnavailable() || !navigator.mediaDevices.getUserMedia) {
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
      await requestMediaPermissions()

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

  // 권한 상태 변경 감지
  useEffect(() => {
    if (hasRequestedPermission) {
      const changed =
        permissions.video !== previousPermissions.video ||
        permissions.audio !== previousPermissions.audio

      setHasPermissionChanged(changed)

      if (changed) {
        setHasRequestedPermission(false)
      }
    }
  }, [permissions, previousPermissions, hasRequestedPermission])

  useEffect(() => {
    initializeMediaDevices()
  }, [])

  return {
    isInitialized,
    isLoadingDevices,
    isConnectingStream,
    devices,
    selectedDevices,
    environmentError,
    permissionError,
    deviceError,
    stream,
    streamState,
    handleDeviceChange,
    getMediaDevices,
    connectStream,
    stopStream,
    permissions,
    isCheckingPermissions,
    getVideoPermissionMessage,
    getAudioPermissionMessage,
    checkPermissions,
    videoRef,
    setVideoRef,
    toggleVideo,
    toggleAudio,
    disconnectVideo,
    disconnectAudio,
    hasRequestedPermission,
    hasPermissionChanged,
  }
}
