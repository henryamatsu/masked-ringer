"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { FaceTracker } from "@/components/FaceTracker";
import { AvatarScene } from "@/components/AvatarScene";

export default function HomePage() {
  const [url] = useState<string>(
    "/models/default-avatar.glb",
  );
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const roomId = await createRoom({});
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("Failed to create room. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div className="App flex flex-col items-center justify-center min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-center">Masked Ringer</h1>
        <button
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {isCreating ? "Creating Room..." : "Create Room"}
        </button>
      </div>
      <div className="w-full max-w-2xl">
        <FaceTracker>
          {({ blendshapes, rotation }) => (
            <AvatarScene
              url={url}
              blendshapes={blendshapes}
              rotation={rotation}
              mirrored={true}
            />
          )}
        </FaceTracker>
      </div>
    </div>
  );
}
