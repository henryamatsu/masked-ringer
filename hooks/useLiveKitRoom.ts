import { useState, useEffect, useCallback, useRef } from "react";
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, TrackPublication, Track, createLocalAudioTrack } from "livekit-client";

interface UseLiveKitRoomReturn {
  room: Room | null;
  participants: Map<string, RemoteParticipant | LocalParticipant>;
  isMuted: boolean;
  toggleMute: () => void;
  disconnect: () => void;
  isConnected: boolean;
  error: string | null;
}

export function useLiveKitRoom(
  roomName: string,
  participantName: string,
  token: string,
  livekitUrl: string
): UseLiveKitRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Map<string, RemoteParticipant | LocalParticipant>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localAudioTrackRef = useRef<TrackPublication | null>(null);

  useEffect(() => {
    // Don't connect if already connected or missing required params
    if (!roomName || !participantName || !token || !livekitUrl) {
      return;
    }

    // If already connected, don't reconnect
    if (isConnected && room) {
      return;
    }

    let currentRoom: Room | null = null;
    let isMounted = true;

    const connectToRoom = async () => {
      setError(null);
      try {
        const newRoom = new Room();
        currentRoom = newRoom;
        
        // Set up event handlers before connecting
        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log("Participant connected:", participant.identity);
          if (isMounted) {
            setParticipants((prev) => {
              const updated = new Map(prev);
              updated.set(participant.identity, participant);
              return updated;
            });
          }
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log("Participant disconnected:", participant.identity);
          if (isMounted) {
            setParticipants((prev) => {
              const updated = new Map(prev);
              updated.delete(participant.identity);
              return updated;
            });
          }
        });

        newRoom.on(RoomEvent.TrackSubscribed, (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
          console.log("Track subscribed:", track.kind, participant.identity);
          if (track.kind === "audio") {
            // Attach audio track to audio element
            const audioElement = track.attach();
            audioElement.play().catch((err) => {
              console.error("Failed to play audio:", err);
            });
          }
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
          console.log("Track unsubscribed:", track.kind, participant.identity);
          track.detach();
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from room");
          if (isMounted) {
            setIsConnected(false);
            setParticipants(new Map());
            setRoom(null);
          }
        });

        // Connect to room
        await newRoom.connect(livekitUrl, token);
        
        if (!isMounted) {
          newRoom.disconnect();
          return;
        }
        
        // Get local audio track
        const localParticipant = newRoom.localParticipant;
        
        // Request microphone access and publish audio track
        try {
          const localTrack = await createLocalAudioTrack();
          const publication = await localParticipant.publishTrack(localTrack);
          localAudioTrackRef.current = publication;
          if (isMounted) {
            setIsMuted(false);
          }
        } catch (err) {
          console.error("Failed to get microphone access:", err);
          // Continue without audio if mic access is denied
        }

        if (!isMounted) {
          newRoom.disconnect();
          return;
        }

        // Add local participant to participants map
        setParticipants((prev) => {
          const updated = new Map(prev);
          updated.set(localParticipant.identity, localParticipant);
          return updated;
        });

        // Add existing remote participants
        newRoom.remoteParticipants.forEach((participant) => {
          setParticipants((prev) => {
            const updated = new Map(prev);
            updated.set(participant.identity, participant);
            return updated;
          });
        });

        setRoom(newRoom);
        setIsConnected(true);
        setError(null);
      } catch (error) {
        console.error("Failed to connect to room:", error);
        if (isMounted) {
          setIsConnected(false);
          setRoom(null);
          setError(error instanceof Error ? error.message : "Failed to connect to room");
        }
        if (currentRoom) {
          currentRoom.disconnect();
        }
      }
    };

    connectToRoom();

    return () => {
      isMounted = false;
      if (currentRoom) {
        currentRoom.disconnect();
      }
    };
  }, [roomName, participantName, token, livekitUrl]);

  const toggleMute = useCallback(() => {
    if (!room) return;

    const localParticipant = room.localParticipant;
    const audioTracks = Array.from(localParticipant.audioTrackPublications.values());

    if (isMuted) {
      // Unmute: enable all audio tracks
      audioTracks.forEach((publication) => {
        if (publication.track) {
          publication.track.unmute();
        }
      });
      setIsMuted(false);
    } else {
      // Mute: disable all audio tracks
      audioTracks.forEach((publication) => {
        if (publication.track) {
          publication.track.mute();
        }
      });
      setIsMuted(true);
    }
  }, [room, isMuted]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setParticipants(new Map());
      setError(null);
    }
  }, [room]);

  return {
    room,
    participants,
    isMuted,
    toggleMute,
    disconnect,
    isConnected,
    error,
  };
}
