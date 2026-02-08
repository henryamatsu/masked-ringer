"use client";

import { AvatarScene } from "./AvatarScene";
import { BlendshapeCategory } from "@/hooks/useFaceTracking";
import { Euler } from "three";

interface ParticipantTileProps {
  participantId: string;
  name: string;
  blendshapes: BlendshapeCategory[];
  rotation: Euler;
  isLocal: boolean;
  isSpeaking: boolean;
}

export function ParticipantTile({
  participantId,
  name,
  blendshapes,
  rotation,
  isLocal,
  isSpeaking,
}: ParticipantTileProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative">
      <div
        className={`relative w-full h-full rounded-lg overflow-hidden border-2 transition-all ${
          isSpeaking
            ? "border-green-500 shadow-lg shadow-green-500/50"
            : "border-gray-300"
        }`}
      >
        <AvatarScene
          url="/models/default-avatar.glb"
          blendshapes={blendshapes}
          rotation={rotation}
          mirrored={isLocal}
          style={{ height: "100%", width: "100%" }}
        />
        {isSpeaking && (
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
      <div className="mt-2 text-center">
        <span className="text-sm font-medium text-gray-700">
          {name}
          {isLocal && <span className="ml-1 text-xs text-gray-500">(You)</span>}
        </span>
      </div>
    </div>
  );
}
