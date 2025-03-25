"use client"

import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { useMediaDevice } from "@/features/media-device"

export const HomePage = () => {
  const {
    isInitialized,
    devices,
    selectedDevices,
    handleDeviceChange,
    stream,
    streamState,
    connectStream,
    setVideoRef,
    toggleVideo,
    toggleAudio,
    isConnectingStream,
  } = useMediaDevice()

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      {/* Content */}
      <div className="w-full max-w-3xl space-y-6">
        {/* Title */}
        <h1 className="text-base font-bold">
          WebRTC 장치 테스트
        </h1>

        {/* Device Select */}
        <div className="space-y-4">
          {/* Video Device */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium">
              비디오 장치
            </h2>
            <Select
              value={selectedDevices.videoDeviceId || undefined}
              onValueChange={(value) => handleDeviceChange("video", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="비디오 장치 선택" />
              </SelectTrigger>
              <SelectContent>
                {devices.videoDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
                {devices.videoDevices.length === 0 && (
                  <SelectItem value="none" disabled>
                    사용 가능한 비디오 장치가 없습니다
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Audio Input Device */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium">
              오디오 입력 장치
            </h2>
            <Select
              value={selectedDevices.audioDeviceId || undefined}
              onValueChange={(value) => handleDeviceChange("audio", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="오디오 입력 장치 선택" />
              </SelectTrigger>
              <SelectContent>
                {devices.audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
                {devices.audioDevices.length === 0 && (
                  <SelectItem value="none" disabled>
                    사용 가능한 오디오 입력 장치가 없습니다
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Connect Button */}
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground"
            onClick={connectStream}
            disabled={!isInitialized || isConnectingStream}
          >
            {!isInitialized ? (
              <div className="flex items-center justify-center gap-2">
                <span>
                  초기화 중...
                </span>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isConnectingStream ? (
              <div className="flex items-center justify-center gap-2">
                <span>
                  연결 중...
                </span>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              "장치 연결"
            )}
          </Button>

          {/* Media Controls */}
          {stream && (
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex flex-col items-center gap-2">
                <Button
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-white",
                    streamState.isVideoEnabled ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
                  )}
                  onClick={toggleVideo}
                  disabled={!streamState.hasVideo}
                  title={streamState.isVideoEnabled ? "카메라 끄기" : "카메라 켜기"}
                >
                  <span className="sr-only">
                    {streamState.isVideoEnabled ? "카메라 끄기" : "카메라 켜기"}
                  </span>
                  {streamState.isVideoEnabled ? (
                    <VideoIcon className="w-5 h-5" />
                  ) : (
                    <VideoOffIcon className="w-5 h-5" />
                  )}
                </Button>
                {/* {streamState.hasVideo && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnectVideo}
                    className="text-xs"
                  >
                    카메라 연결 해제
                  </Button>
                )} */}
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full text-white",
                    streamState.isAudioEnabled ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
                  )}
                  onClick={toggleAudio}
                  disabled={!streamState.hasAudio}
                  title={streamState.isAudioEnabled ? "마이크 끄기" : "마이크 켜기"}
                >
                  <span className="sr-only">
                    {streamState.isAudioEnabled ? "마이크 끄기" : "마이크 켜기"}
                  </span>
                  {streamState.isAudioEnabled ? (
                    <MicIcon className="w-5 h-5" />
                  ) : (
                    <MicOffIcon className="w-5 h-5" />
                  )}
                </Button>
                {/* {streamState.hasAudio && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={disconnectAudio}
                    className="text-xs"
                  >
                    마이크 연결 해제
                  </Button>
                )} */}
              </div>
            </div>
          )}

          {/* Video Preview */}
          <div className="mt-4">
            <h2 className="text-sm font-medium mb-2">
              미디어 프리뷰
            </h2>
            <div className="relative bg-gray-100 rounded-md overflow-hidden aspect-video w-full max-w-[320px] mx-auto">
              {streamState.hasVideo || streamState.hasAudio ? (
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted={!streamState.hasAudio || !streamState.isAudioEnabled}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {stream ? "비디오 신호가 없습니다" : "장치를 연결해주세요"}
                </div>
              )}

              {/* 비디오 비활성화 표시 */}
              {stream && streamState.hasVideo && !streamState.isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 text-white">
                  <div className="flex flex-col items-center">
                    <VideoOffIcon className="w-10 h-10" />
                    <span className="mt-2 text-sm">
                      카메라가 꺼져 있습니다
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
