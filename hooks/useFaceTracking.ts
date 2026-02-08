import { useEffect, useState, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Euler, Matrix4 } from "three";

export interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

let faceLandmarker: FaceLandmarker;

export function useFaceTracking() {
  const [blendshapes, setBlendshapes] = useState<BlendshapeCategory[]>([]);
  const [rotation, setRotation] = useState<Euler>(new Euler());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const setup = async () => {
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

      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predict);
      }
    };

    let lastVideoTime = -1;

    const predict = async () => {
      if (!videoRef.current) return;

      const nowInMs = Date.now();
      if (lastVideoTime !== videoRef.current.currentTime) {
        lastVideoTime = videoRef.current.currentTime;

        const result = faceLandmarker.detectForVideo(videoRef.current, nowInMs);

        if (result.faceBlendshapes?.[0]?.categories) {
          const categories: BlendshapeCategory[] =
            result.faceBlendshapes[0].categories.map((c) => ({
              categoryName: c.categoryName,
              score: c.score,
            }));
          setBlendshapes(categories);

          const matrix = new Matrix4().fromArray(
            result.facialTransformationMatrixes![0].data,
          );
          setRotation(new Euler().setFromRotationMatrix(matrix));
        }
      }

      requestAnimationFrame(predict);
    };

    setup();
  }, []);

  return { blendshapes, rotation, videoRef };
}
