export interface MediaRecorderState {
  isRecording: boolean
  hasVideo: boolean
  hasAudio: boolean
  recordedChunks: Blob[]
  recorderError: string | null
  duration: number
  formattedDuration: string
}

export interface MediaRecorderOptions {
  mimeType?: string
  videoBitsPerSecond?: number
  audioBitsPerSecond?: number
  bitsPerSecond?: number
}
