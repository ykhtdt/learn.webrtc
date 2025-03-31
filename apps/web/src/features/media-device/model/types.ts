export interface MediaDeviceState {
  videoDevices: MediaDeviceInfo[]
  audioDevices: MediaDeviceInfo[]
}

export interface SelectedDevicesState {
  videoDeviceId: string | null
  audioDeviceId: string | null
}

export interface StreamState {
  hasAudio: boolean
  hasVideo: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
}

export type PermissionStatus = "granted" | "denied" | "prompt" | "unknown"

export interface PermissionState {
  video: PermissionStatus
  audio: PermissionStatus
}
