"use client";

import { RemoteParticipantData } from "@/hooks/useLiveKitRoom";
import { ParticipantTile } from "./ParticipantTile";
import { BlendshapeCategory } from "@/hooks/useFaceTracking";
import { Euler } from "three";

interface ParticipantGridProps {
  participants: Array<{
    participantId: string;
    name: string;
    blendshapes: BlendshapeCategory[];
    rotation: Euler;
    isSpeaking: boolean;
    isLocal: boolean;
  }>;
}

export function ParticipantGrid({ participants }: ParticipantGridProps) {
  const participantCount = participants.length;

  if (participantCount === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No participants</div>
      </div>
    );
  }

  // Calculate grid layout: cols = Math.ceil(Math.sqrt(participantCount))
  const cols = Math.ceil(Math.sqrt(participantCount));
  const rows = Math.ceil(participantCount / cols);

  return (
    <div
      className="w-full h-full grid gap-4 p-4"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.participantId}
          participantId={participant.participantId}
          name={participant.name}
          blendshapes={participant.blendshapes}
          rotation={participant.rotation}
          isLocal={participant.isLocal}
          isSpeaking={participant.isSpeaking}
        />
      ))}
    </div>
  );
}
