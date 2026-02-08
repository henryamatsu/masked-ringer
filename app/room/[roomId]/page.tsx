"use client";

import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaceTracker } from "@/components/FaceTracker";
import { ParticipantGrid } from "@/components/ParticipantGrid";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { BlendshapeCategory } from "@/hooks/useFaceTracking";
import { Euler } from "three";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const router = useRouter();
  const { roomId } = use(params);
  const roomName = roomId;
  const [participantName, setParticipantName] = useState("");
  
  // Load from localStorage only on client side after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("participantName");
      if (saved) {
        setParticipantName(saved);
      }
    }
  }, []);
  const [hasJoined, setHasJoined] = useState(false);
  const [localBlendshapes, setLocalBlendshapes] = useState<
    BlendshapeCategory[]
  >([]);
  const [localRotation, setLocalRotation] = useState<Euler>(new Euler());

  // Use LiveKit room hook (only after joining with valid name)
  const trimmedName = participantName.trim();
  const shouldConnect = hasJoined && trimmedName.length > 0;
  
  const {
    room,
    participants: remoteParticipants,
    isConnected,
    disconnect: disconnectRoom,
    sendFaceData,
  } = useLiveKitRoom(
    shouldConnect ? roomName : "",
    shouldConnect ? trimmedName : "",
  );

  const handleJoin = () => {
    if (!participantName.trim()) {
      alert("Please enter your name");
      return;
    }
    const trimmedName = participantName.trim();
    // Save name to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("participantName", trimmedName);
    }
    setHasJoined(true);
  };

  const handleLeave = () => {
    disconnectRoom();
    setHasJoined(false);
    router.push("/");
  };

  // Memoize the face tracking callback to prevent re-initialization
  const handleFaceDataChange = useCallback((blendshapes: BlendshapeCategory[], rotation: Euler) => {
    setLocalBlendshapes(blendshapes);
    setLocalRotation(rotation);
    if (hasJoined && isConnected) {
      sendFaceData(blendshapes, rotation);
    }
  }, [hasJoined, isConnected, sendFaceData]);

  // Show join form if not joined yet
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Join Room: {roomName}</h1>
        <div className="flex flex-col gap-4 w-full max-w-md">
          <input
            type="text"
            placeholder="Enter your name"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleJoin();
              }
            }}
            className="px-4 py-2 border rounded-lg"
            autoFocus
          />
          <button
            onClick={handleJoin}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // Show room view
  // Combine local participant with remote participants
  const allParticipants = [
    {
      participantId: room?.localParticipant?.identity || "local",
      name: trimmedName || participantName,
      blendshapes: localBlendshapes,
      rotation: localRotation,
      isLocal: true,
      isSpeaking: false, // Local speaking detection can be added later
    },
    ...(Array.isArray(remoteParticipants) ? remoteParticipants : []).map((p) => ({
      ...p,
      isLocal: false,
    })),
  ];

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Room: {roomName}</h1>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <span className="text-sm text-green-600">Connected</span>
          ) : (
            <span className="text-sm text-yellow-600">Connecting...</span>
          )}
          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Face tracking with callback to send data */}
      <FaceTracker
        onDataChange={handleFaceDataChange}
        showVideo={false}
      >
        {() => null}
      </FaceTracker>

      {/* Participant grid */}
      <div className="flex-1 overflow-hidden">
        <ParticipantGrid participants={allParticipants} />
      </div>
    </div>
  );
}
