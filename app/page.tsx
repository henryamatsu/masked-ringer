// components/AvatarCanvas.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Color, Euler, Matrix4, Mesh } from "three";
import { Canvas, useFrame, useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

interface AvatarProps {
  url: string;
  blendshapes: BlendshapeCategory[];
  rotation: Euler;
}

let faceLandmarker: FaceLandmarker;

export default function AvatarCanvas() {
  const [url, setUrl] = useState<string>(
    "https://models.readyplayer.me/6460d95f9ae10f45bffb2864.glb?morphTargets=ARKit&textureAtlas=1024",
  );
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

  return (
    <div className="App">
      <video className="camera-feed" ref={videoRef} autoPlay />
      <Canvas style={{ height: 600 }} camera={{ fov: 25 }} shadows>
        <ambientLight intensity={1} />
        <pointLight
          position={[10, 10, 10]}
          color={new Color(1, 1, 0)}
          intensity={0.5}
          castShadow
        />
        <pointLight
          position={[-10, 0, 10]}
          color={new Color(1, 0, 0)}
          intensity={0.5}
          castShadow
        />
        <pointLight position={[0, 0, 10]} intensity={0.5} castShadow />
        <Avatar url={url} blendshapes={blendshapes} rotation={rotation} />
      </Canvas>
    </div>
  );
}

function Avatar({ url, blendshapes, rotation }: AvatarProps) {
  const { scene } = useGLTF(url);
  const { nodes } = useGraph(scene);

  const headMesh = useRef<Mesh[]>([]);

  useEffect(() => {
    const meshes = [
      nodes.Wolf3D_Head,
      nodes.Wolf3D_Teeth,
      nodes.Wolf3D_Beard,
      nodes.Wolf3D_Avatar,
      nodes.Wolf3D_Head_Custom,
    ].filter((mesh): mesh is Mesh => !!mesh);

    headMesh.current = meshes;
  }, [nodes, url]);

  useFrame(() => {
    if (blendshapes.length > 0) {
      blendshapes.forEach((element) => {
        headMesh.current.forEach((mesh) => {
          const index = mesh.morphTargetDictionary![element.categoryName];
          if (index >= 0) mesh.morphTargetInfluences![index] = element.score;
        });
      });

      nodes.Head.rotation.set(rotation.x, rotation.y, rotation.z);
      nodes.Neck.rotation.set(
        rotation.x / 5 + 0.3,
        rotation.y / 5,
        rotation.z / 5,
      );
      nodes.Spine2.rotation.set(rotation.x / 5, rotation.y / 5, rotation.z / 5);
    }
  });

  return <primitive object={scene} position={[0, -1.75, 3]} />;
}
