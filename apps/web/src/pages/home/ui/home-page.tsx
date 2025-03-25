"use client"

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
    // isInitialized,
    devices,
  } = useMediaDevice()

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4">
      {/* Content */}
      <div className="w-full max-w-3xl space-y-6">
        {/* Title */}
        <h1 className="text-base font-bold">
          WebRTC 장치 테스트
        </h1>

        {/* Device Selection */}
        <div className="space-y-4">
          {/* Video Device */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium">
              비디오 장치
            </h2>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="비디오 장치 선택" />
              </SelectTrigger>
              <SelectContent>
                {devices.videoDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `비디오 장치 ${device.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
                {devices.videoDevices.length === 0 && (
                  <SelectItem value="no-device" disabled>
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
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="오디오 입력 장치 선택" />
              </SelectTrigger>
              <SelectContent>
                {devices.audioDevices.filter(device => device.kind === "audioinput").map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `오디오 입력 장치 ${device.deviceId.substring(0, 8)}`}
                  </SelectItem>
                ))}
                {devices.audioDevices.filter(device => device.kind === "audioinput").length === 0 && (
                  <SelectItem value="no-device" disabled>
                    사용 가능한 오디오 입력 장치가 없습니다
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

        </div>

      </div>
    </div>
  )
}
