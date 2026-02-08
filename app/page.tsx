"use client";

import { useState } from "react";
import { FaceTracker } from "@/components/FaceTracker";
import { AvatarScene } from "@/components/AvatarScene";

export default function HomePage() {
  const [url] = useState<string>(
    "/models/default-avatar.glb",
  );

  return (
    <div className="App">
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
  );
}
