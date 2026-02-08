"use client";

import { useEffect, useRef } from "react";
import { Euler, Mesh } from "three";
import { useFrame, useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { BlendshapeCategory } from "@/hooks/useFaceTracking";

interface AvatarProps {
  url: string;
  blendshapes: BlendshapeCategory[];
  rotation: Euler;
  mirrored?: boolean;
}

export function Avatar({ url, blendshapes, rotation, mirrored = false }: AvatarProps) {
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
    if (blendshapes.length > 0 && headMesh.current.length > 0) {
      blendshapes.forEach((element) => {
        headMesh.current.forEach((mesh) => {
          if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            const index = mesh.morphTargetDictionary[element.categoryName];
            if (index !== undefined && index >= 0) {
              mesh.morphTargetInfluences[index] = element.score;
            }
          }
        });
      });

      // Safely access rotation nodes
      if (nodes.Head) {
        nodes.Head.rotation.set(rotation.x, rotation.y, rotation.z);
      }
      if (nodes.Neck) {
        nodes.Neck.rotation.set(
          rotation.x / 5 + 0.3,
          rotation.y / 5,
          rotation.z / 5,
        );
      }
      if (nodes.Spine2) {
        nodes.Spine2.rotation.set(rotation.x / 5, rotation.y / 5, rotation.z / 5);
      }
    }
  });

  return (
    <primitive 
      object={scene} 
      position={[0, -1.75, 3]} 
      scale={mirrored ? [-1, 1, 1] : [1, 1, 1]}
    />
  );
}
