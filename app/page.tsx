"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      alert("Please enter a room name");
      return;
    }
    router.push(`/room/${encodeURIComponent(roomName.trim())}`);
  };

  return (
    <div className="App flex flex-col items-center justify-center min-h-screen p-4">
      <div className="mb-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-center">Masked Ringer</h1>
        <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="px-4 py-3 border rounded-lg text-lg"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg font-semibold"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
