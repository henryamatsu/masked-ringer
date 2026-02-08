"use client";

import { useFaceTracking } from "@/hooks/useFaceTracking";
import { BlendshapeCategory } from "@/hooks/useFaceTracking";
import { Euler } from "three";

interface FaceTrackerProps {
  children: (data: {
    blendshapes: ReturnType<typeof useFaceTracking>["blendshapes"];
    rotation: ReturnType<typeof useFaceTracking>["rotation"];
  }) => React.ReactNode;
  onDataChange?: (blendshapes: BlendshapeCategory[], rotation: Euler) => void;
  showVideo?: boolean;
}

export function FaceTracker({
  children,
  onDataChange,
  showVideo = false,
}: FaceTrackerProps) {
  const { blendshapes, rotation, videoRef } = useFaceTracking({ onDataChange });

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={showVideo ? "face-tracker-video" : "hidden"}
        style={showVideo ? {} : { display: "none" }}
      />
      {children({ blendshapes, rotation })}
    </>
  );
}
