"use client";

import { useState, use, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FaceTracker } from "@/components/FaceTracker";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { ControlBar } from "@/components/ControlBar";

// @react-three/fiber cannot run during SSR — must be loaded client-only
const AvatarScene = dynamic(
  () => import("@/components/AvatarScene").then((mod) => ({ default: mod.AvatarScene })),
  { ssr: false, loading: () => <div style={{ height: 600 }}>Loading 3D...</div> }
);

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const router = useRouter();
  const { roomId } = use(params);
  const decodedRoomId = decodeURIComponent(roomId);
  
  const [participantName, setParticipantName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("participantName") || "";
    }
    return "";
  });
  const [hasJoined, setHasJoined] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const livekitUrl = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_URL || "" : "";

  const {
    room,
    participants,
    isMuted,
    toggleMute,
    disconnect,
    isConnected,
    error: connectionError,
  } = useLiveKitRoom(
    decodedRoomId,
    participantName,
    token || "",
    livekitUrl
  );

  const handleJoin = async () => {
    if (!participantName.trim()) {
      alert("Please enter your name");
      return;
    }
    const trimmedName = participantName.trim();
    
    // Save name to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("participantName", trimmedName);
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Fetch token from API
      const response = await fetch("/api/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: decodedRoomId,
          participantName: trimmedName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get token");
      }

      const { token: fetchedToken } = await response.json();
      
      if (!livekitUrl) {
        throw new Error("LiveKit URL not configured. Please set NEXT_PUBLIC_LIVEKIT_URL in .env.local");
      }

      setToken(fetchedToken);
      setHasJoined(true);
      setIsConnecting(false);
    } catch (err) {
      console.error("Failed to join room:", err);
      setError(err instanceof Error ? err.message : "Failed to join room");
      setIsConnecting(false);
    }
  };

  const handleLeave = () => {
    disconnect();
    router.push("/");
  };

  // Show join form if not joined yet
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">
          Join Room: {decodedRoomId}
        </h1>
        <div className="flex flex-col gap-4 w-full max-w-md">
          <input
            type="text"
            placeholder="Enter your name"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isConnecting) {
                handleJoin();
              }
            }}
            className="px-4 py-2 border rounded-lg"
            autoFocus
            disabled={isConnecting}
          />
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <button
            onClick={handleJoin}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? "Connecting..." : "Join Room"}
          </button>
        </div>
      </div>
    );
  }

  // Show connecting state while hook is connecting
  if (!isConnected && !connectionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-lg mb-4">Connecting to room...</div>
        {token && (
          <div className="text-sm text-gray-500">Please wait</div>
        )}
      </div>
    );
  }

  // Show error state
  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">Connection Error</h1>
        <div className="text-red-500 mb-4">{connectionError}</div>
        <button
          onClick={() => {
            setToken(null);
            setHasJoined(false);
            setError(null);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show room view
  const participantCount = participants.size;

  return (
    <div className="flex flex-col h-screen pb-20">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">
          Room: {decodedRoomId}
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-8">
          <FaceTracker>
            {({ blendshapes, rotation }) => (
              <AvatarScene
                url="/models/default-avatar.glb"
                blendshapes={blendshapes}
                rotation={rotation}
                mirrored={true}
              />
            )}
          </FaceTracker>
        </div>

        <div className="w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-2">
            {participantCount > 0 ? (
              Array.from(participants.values()).map((participant) => (
                <div
                  key={participant.identity}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <span>{participant.identity}</span>
                  {participant.identity === participantName && (
                    <span className="text-sm text-gray-500">(You)</span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No other participants yet</div>
            )}
          </div>
        </div>
      </div>

      <ControlBar
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onLeave={handleLeave}
        participantCount={participantCount}
      />
    </div>
  );
}
