"use client";

import { Color } from "three";
import { Canvas } from "@react-three/fiber";
import { Avatar } from "./Avatar";
import { BlendshapeCategory } from "@/hooks/useFaceTracking";
import { Euler } from "three";

interface AvatarSceneProps {
  url: string;
  blendshapes: BlendshapeCategory[];
  rotation: Euler;
  mirrored?: boolean;
  style?: React.CSSProperties;
}

export function AvatarScene({
  url,
  blendshapes,
  rotation,
  mirrored = false,
  style,
}: AvatarSceneProps) {
  return (
    <Canvas style={style || { height: 600 }} camera={{ fov: 25 }} shadows>
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
      <Avatar
        url={url}
        blendshapes={blendshapes}
        rotation={rotation}
        mirrored={mirrored}
      />
    </Canvas>
  );
}
