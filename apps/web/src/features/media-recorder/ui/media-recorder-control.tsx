"use client"

import { Button } from "@workspace/ui/components/button"

import { useMediaRecorder } from "@/features/media-recorder"

interface StreamState {
  hasAudio: boolean
  hasVideo: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
}

interface MediaRecorderControlsProps {
  stream: MediaStream | null
  streamState: StreamState
}

export const MediaRecorderControl = ({
  stream,
  streamState,
}: MediaRecorderControlsProps) => {
  const {
    isRecording,
    hasVideo,
    hasAudio,
    formattedDuration,
    recorderError,
    startRecording,
    stopRecording,
    handleDownload,
    recordedChunks,
  } = useMediaRecorder(stream)

  const isVideoEnabled = streamState.isVideoEnabled
  const isAudioEnabled = streamState.isAudioEnabled
  const hasRecordedChunks = recordedChunks.length > 0

  return (
    <div className="space-y-4">

      {/* 에러 메시지 */}
      {recorderError && (
        <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm">
          {recorderError}
        </div>
      )}

      {/* 녹화 상태 표시 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isRecording && (
            <>
              {hasVideo && isVideoEnabled && (
                <span className="text-sm text-zinc-600">
                  카메라 녹화 중
                </span>
              )}
              {hasAudio && isAudioEnabled && (
                <span className="text-sm text-zinc-600">
                  마이크 녹음 중
                </span>
              )}
            </>
          )}
        </div>

        {isRecording && (
          <span className="text-sm font-medium text-red-500">
            {formattedDuration}
          </span>
        )}
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            녹화 시작
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            녹화 중지
          </Button>
        )}
      </div>

      {/* 다운로드 버튼 */}
      {!isRecording && hasRecordedChunks && (
        <Button
          onClick={handleDownload}
          className="w-full bg-blue-500 text-white hover:bg-blue-600"
        >
          녹화 파일 다운로드
        </Button>
      )}
    </div>
  )
}
