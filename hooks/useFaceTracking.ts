import { useEffect, useState, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Euler, Matrix4 } from "three";

export interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

let faceLandmarker: FaceLandmarker | null = null;

interface UseFaceTrackingOptions {
  onDataChange?: (blendshapes: BlendshapeCategory[], rotation: Euler) => void;
}

export function useFaceTracking(options?: UseFaceTrackingOptions) {
  const { onDataChange } = options || {};
  const [blendshapes, setBlendshapes] = useState<BlendshapeCategory[]>([]);
  const [rotation, setRotation] = useState<Euler>(new Euler());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastCallbackTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPredictingRef = useRef(false);
  const onDataChangeRef = useRef(onDataChange);
  const targetFPS = 30; // Target 30fps for data sync
  const frameInterval = 1000 / targetFPS; // ~33ms between frames

  // Update ref when callback changes (without triggering re-initialization)
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  useEffect(() => {
    let isMounted = true;
    let lastVideoTime = -1;

    const setup = async () => {
      try {
        // Prevent multiple initializations
        if (isPredictingRef.current || streamRef.current) {
          return;
        }

        // Initialize face landmarker if not already initialized
        if (!faceLandmarker) {
          const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
          );

          faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            numFaces: 1,
            runningMode: "VIDEO",
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
        }

        // Check if video ref is available
        if (!videoRef.current) {
          console.warn("Video ref not available yet, retrying...");
          setTimeout(() => {
            if (isMounted && videoRef.current && !isPredictingRef.current && !streamRef.current) {
              setup();
            }
          }, 100);
          return;
        }

        // Get video stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Ensure video plays
          videoRef.current.play().catch((err) => {
            console.error("Failed to play video:", err);
          });
          
          // Wait for video to be ready
          const handleLoadedData = () => {
            if (isMounted && !isPredictingRef.current && videoRef.current && faceLandmarker) {
              videoRef.current.play().catch(console.error);
              startPrediction();
            }
          };
          
          videoRef.current.addEventListener("loadeddata", handleLoadedData, { once: true });

          // Start prediction if video is already loaded
          if (videoRef.current.readyState >= 2) {
            if (isMounted && !isPredictingRef.current) {
              videoRef.current.play().catch(console.error);
              startPrediction();
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize face tracking:", error);
      }
    };

    const startPrediction = () => {
      if (!faceLandmarker || !videoRef.current || isPredictingRef.current) {
        return;
      }

      isPredictingRef.current = true;
      lastVideoTime = -1;

      const predict = () => {
        if (!isMounted || !videoRef.current || !faceLandmarker) {
          isPredictingRef.current = false;
          return;
        }

        try {
          const nowInMs = Date.now();
          const currentTime = videoRef.current.currentTime;

          if (lastVideoTime !== currentTime && currentTime > 0) {
            lastVideoTime = currentTime;

            const result = faceLandmarker.detectForVideo(videoRef.current, nowInMs);

            if (result.faceBlendshapes?.[0]?.categories && isMounted) {
              const categories: BlendshapeCategory[] =
                result.faceBlendshapes[0].categories.map((c) => ({
                  categoryName: c.categoryName,
                  score: c.score,
                }));
              setBlendshapes(categories);

              if (result.facialTransformationMatrixes?.[0]?.data && isMounted) {
                const matrix = new Matrix4().fromArray(
                  result.facialTransformationMatrixes[0].data,
                );
                const newRotation = new Euler().setFromRotationMatrix(matrix);
                setRotation(newRotation);

                // Throttle callback to ~30fps
                if (onDataChangeRef.current) {
                  const now = Date.now();
                  if (now - lastCallbackTimeRef.current >= frameInterval) {
                    lastCallbackTimeRef.current = now;
                    onDataChangeRef.current(categories, newRotation);
                  }
                }
              }
            }
          }

          if (isMounted && animationFrameRef.current !== null) {
            animationFrameRef.current = requestAnimationFrame(predict);
          } else {
            isPredictingRef.current = false;
          }
        } catch (error) {
          console.error("Error in face prediction:", error);
          isPredictingRef.current = false;
        }
      };

      if (isMounted) {
        animationFrameRef.current = requestAnimationFrame(predict);
      }
    };

    setup();

    return () => {
      isMounted = false;
      isPredictingRef.current = false;
      
      // Stop animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      // Clear video srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
    // Only run once on mount - don't depend on onDataChange to prevent re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { blendshapes, rotation, videoRef };
}
