"use client";

import { useFaceTracking } from "@/hooks/useFaceTracking";

interface FaceTrackerProps {
  children: (data: {
    blendshapes: ReturnType<typeof useFaceTracking>["blendshapes"];
    rotation: ReturnType<typeof useFaceTracking>["rotation"];
  }) => React.ReactNode;
}

export function FaceTracker({ children }: FaceTrackerProps) {
  const { blendshapes, rotation, videoRef } = useFaceTracking();

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        className="face-tracker-video"
      />
      {children({ blendshapes, rotation })}
    </>
  );
}
