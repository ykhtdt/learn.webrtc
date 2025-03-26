"use client"

import { Button } from "@workspace/ui/components/button"

interface MediaRecorderControlsProps {
  isRecording: boolean
  hasVideo: boolean
  hasAudio: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  duration: number
  formattedDuration: string
  error: string | null
  hasRecordedChunks: boolean
  onStart: () => void
  onStop: () => void
  onDownload: () => void
}

export const MediaRecorderControl = ({
  isRecording,
  hasVideo,
  hasAudio,
  isVideoEnabled,
  isAudioEnabled,
  formattedDuration,
  error,
  hasRecordedChunks,
  onStart,
  onStop,
  onDownload,
}: MediaRecorderControlsProps) => {
  return (
    <div className="space-y-4">

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 rounded-md bg-red-100 text-red-800 text-sm">
          {error}
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
            onClick={onStart}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            녹화 시작
          </Button>
        ) : (
          <Button
            onClick={onStop}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            녹화 중지
          </Button>
        )}
      </div>

      {/* 다운로드 버튼 */}
      {!isRecording && hasRecordedChunks && (
        <Button
          onClick={onDownload}
          className="w-full bg-blue-500 text-white hover:bg-blue-600"
        >
          녹화 파일 다운로드
        </Button>
      )}
    </div>
  )
}
