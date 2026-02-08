"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName) {
      alert("Please enter a room name");
      return;
    }
    // Navigate to room page
    const roomPath = `/room/${encodeURIComponent(trimmedRoomName)}`;
    router.push(roomPath);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Masked Ringer
        </h1>
        <p className="text-gray-300 text-center mb-8">
          Enter a room name to join or create a room
        </p>

        <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter room name (e.g., 'my-room')"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="px-4 py-3 border border-gray-600 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors font-semibold"
          >
            Join Room
          </button>
        </form>

        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Tip: Share the room name with others to join the same room</p>
        </div>
      </div>
    </div>
  );
}
