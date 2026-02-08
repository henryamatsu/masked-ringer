import { useEffect, useState, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalTrackPublication,
  createLocalAudioTrack,
} from "livekit-client";
import { BlendshapeCategory } from "./useFaceTracking";
import { Euler } from "three";

export interface RemoteParticipantData {
  participantId: string;
  name: string;
  blendshapes: BlendshapeCategory[];
  rotation: Euler;
  isSpeaking: boolean;
}

interface UseLiveKitRoomReturn {
  room: Room | null;
  participants: RemoteParticipantData[];
  isConnected: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  disconnect: () => void;
  sendFaceData: (blendshapes: BlendshapeCategory[], rotation: Euler) => void;
}

export function useLiveKitRoom(
  roomName: string,
  participantName: string,
): UseLiveKitRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<
    Map<string, RemoteParticipantData>
  >(new Map());
  const localFaceDataRef = useRef<{
    blendshapes: BlendshapeCategory[];
    rotation: Euler;
  } | null>(null);
  const audioTrackRef = useRef<LocalTrackPublication | null>(null);

  // Fetch token and connect to room
  useEffect(() => {
    // Don't connect if roomName or participantName is empty
    if (!roomName || !participantName) {
      return;
    }

    let currentRoom: Room | null = null;

    const connect = async () => {
      try {
        // Fetch token from API
        const response = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName, participantName }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Failed to get token: ${response.status}`);
        }

        const { token } = await response.json();
        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

        if (!livekitUrl) {
          throw new Error("LIVEKIT_URL not configured. Please set NEXT_PUBLIC_LIVEKIT_URL in .env.local");
        }

        // Create and connect to room
        currentRoom = new Room();
        setRoom(currentRoom);

        // Set up event listeners
        currentRoom.on(RoomEvent.Connected, async () => {
          console.log("Connected to room");
          setIsConnected(true);

          // Set participant metadata (if permission allows)
          try {
            currentRoom?.localParticipant.setMetadata(
              JSON.stringify({ name: participantName }),
            );
          } catch (error) {
            console.warn("Could not set metadata:", error);
            // Continue without metadata - not critical
          }

          // Publish microphone audio track
          try {
            const audioTrack = await createLocalAudioTrack();
            const publication =
              await currentRoom?.localParticipant.publishTrack(audioTrack);
            if (publication) {
              audioTrackRef.current = publication;
              setIsMuted(false);
            }
          } catch (error) {
            console.error("Failed to publish audio track:", error);
          }
        });

        // Listen for remote audio tracks
        currentRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === "audio" && participant) {
            // Attach audio track to audio element
            const audioElement = track.attach();
            audioElement.play().catch((err) => {
              console.error("Failed to play remote audio:", err);
            });
          }
        });

        currentRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
        });

        // Listen for data messages (face tracking data)
        currentRoom.on(RoomEvent.DataReceived, (payload, participant) => {
          if (
            !participant ||
            participant.identity === currentRoom?.localParticipant.identity
          ) {
            return; // Ignore our own data
          }

          try {
            const decoder = new TextDecoder();
            const dataStr = decoder.decode(payload);
            const data = JSON.parse(dataStr);

            if (data.type === "face-data" && data.participantId) {
              setRemoteParticipants((prev) => {
                const updated = new Map(prev);
                const existing = updated.get(data.participantId) || {
                  participantId: data.participantId,
                  name: data.name || participant?.identity || "Unknown",
                  blendshapes: [],
                  rotation: new Euler(),
                  isSpeaking: false,
                };
                updated.set(data.participantId, {
                  ...existing,
                  blendshapes: data.blendshapes || existing.blendshapes,
                  rotation: data.rotation
                    ? new Euler(
                        data.rotation.x,
                        data.rotation.y,
                        data.rotation.z,
                      )
                    : existing.rotation,
                });
                return updated;
              });
            }
          } catch (error) {
            console.error("Error parsing face data:", error);
          }
        });

        currentRoom.on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from room");
          setIsConnected(false);
        });

        currentRoom.on(
          RoomEvent.ParticipantConnected,
          (participant: RemoteParticipant) => {
            console.log("Participant connected:", participant.identity);
            // Parse metadata for name
            let name = participant.identity;
            try {
              const metadata = JSON.parse(participant.metadata || "{}");
              name = metadata.name || participant.identity;
            } catch {}

            setRemoteParticipants((prev) => {
              const updated = new Map(prev);
              updated.set(participant.identity, {
                participantId: participant.identity,
                name,
                blendshapes: [],
                rotation: new Euler(),
                isSpeaking: false,
              });
              return updated;
            });

            // Listen for speaking events
            participant.on("isSpeakingChanged", () => {
              setRemoteParticipants((prev) => {
                const updated = new Map(prev);
                const existing = updated.get(participant.identity);
                if (existing) {
                  updated.set(participant.identity, {
                    ...existing,
                    isSpeaking: participant.isSpeaking,
                  });
                }
                return updated;
              });
            });
          },
        );

        currentRoom.on(
          RoomEvent.ParticipantDisconnected,
          (participant: RemoteParticipant) => {
            console.log("Participant disconnected:", participant.identity);
            setRemoteParticipants((prev) => {
              const updated = new Map(prev);
              updated.delete(participant.identity);
              return updated;
            });
          },
        );

        // Connect to room
        await currentRoom.connect(livekitUrl, token);
      } catch (error) {
        console.error("Failed to connect to room:", error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (currentRoom) {
        currentRoom.disconnect();
      }
    };
  }, [roomName, participantName]);

  const toggleMute = useCallback(async () => {
    if (!room || !audioTrackRef.current) return;

    try {
      if (isMuted) {
        await audioTrackRef.current.track?.unmute();
        setIsMuted(false);
      } else {
        await audioTrackRef.current.track?.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  }, [room, isMuted]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
  }, [room]);

  const sendFaceData = useCallback(
    (blendshapes: BlendshapeCategory[], rotation: Euler) => {
      if (!room || !isConnected) {
        return;
      }

      // Store latest data
      localFaceDataRef.current = { blendshapes, rotation };

      // Send via LiveKit data channel
      try {
        const data = {
          type: "face-data",
          participantId: room.localParticipant.identity,
          name: participantName,
          blendshapes,
          rotation: {
            x: rotation.x,
            y: rotation.y,
            z: rotation.z,
          },
        };
        const encoder = new TextEncoder();
        const encoded = encoder.encode(JSON.stringify(data));
        // Use unreliable data channel for lower latency (acceptable packet loss for animation data)
        room.localParticipant.publishData(encoded, { reliable: false });
      } catch (error) {
        console.error("Error sending face data:", error);
      }
    },
    [room, participantName, isConnected],
  );

  const participants = Array.from(remoteParticipants.values());

  return {
    room,
    participants,
    isConnected,
    isMuted,
    toggleMute,
    disconnect,
    sendFaceData,
  };
}
