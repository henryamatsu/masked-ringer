"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FaceTracker } from "@/components/FaceTracker";

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
  const { roomId: roomIdParam } = use(params);
  const roomId = roomIdParam as Id<"rooms">;
  const [participantName, setParticipantName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("participantName") || "";
    }
    return "";
  });
  const [hasJoined, setHasJoined] = useState(false);
  const [participantId, setParticipantId] = useState<Id<"participants"> | null>(
    null
  );

  const room = useQuery(api.rooms.getRoom, { roomId });
  const participants = useQuery(api.participants.listByRoom, { roomId });
  const joinRoom = useMutation(api.participants.join);
  const leaveRoom = useMutation(api.participants.leave);

  useEffect(() => {
    // Check if room exists and is active
    if (room === null) {
      // Still loading
      return;
    }
    if (room === undefined || !room.isActive) {
      router.push("/");
      return;
    }
  }, [room, router]);

  const handleJoin = async () => {
    if (!participantName.trim()) {
      alert("Please enter your name");
      return;
    }
    const trimmedName = participantName.trim();
    try {
      // Save name to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("participantName", trimmedName);
      }
      const id = await joinRoom({
        roomId,
        name: trimmedName,
      });
      setParticipantId(id);
      setHasJoined(true);
    } catch (error) {
      console.error("Failed to join room:", error);
      alert("Failed to join room. Please try again.");
    }
  };

  const handleLeave = async () => {
    if (participantId) {
      try {
        await leaveRoom({ participantId });
      } catch (error) {
        console.error("Failed to leave room:", error);
      }
    }
    router.push("/");
  };

  // Show loading state
  if (room === null || participants === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading room...</div>
      </div>
    );
  }

  // Show join form if not joined yet
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">
          Join Room: {room?.name || "Unnamed Room"}
        </h1>
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
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">
          {room?.name || "Unnamed Room"}
        </h1>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Leave Room
        </button>
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
            {participants && participants.length > 0 ? (
              participants.map((participant) => (
                <div
                  key={participant._id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <span>{participant.name}</span>
                  {participant._id === participantId && (
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
    </div>
  );
}
