import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html } from "@react-three/drei";
import { AVATARS, type AvatarType, type AvatarConfig } from "@/lib/avatarRenderer";

interface AvatarSelectorProps {
  selected: AvatarType;
  onSelect: (avatar: AvatarType) => void;
}

// 3D model viewer component for the selected avatar
function Avatar3DView({ avatarType }: { avatarType: AvatarType }) {
  // Decide which model to load (fallback to null for 'none')
  let modelPath: string | null = null;
  if (avatarType === "hulk") modelPath = "/models/hulk.glb";
  if (avatarType === "thor") modelPath = "/models/thor.glb";

  // useGLTF hooks must be called unconditionally, so we use a conditional inside
  const { scene: hulkScene } = useGLTF(modelPath ?? "/models/hulk.glb", undefined, { enabled: modelPath === "hulk" });
  const { scene: thorScene } = useGLTF(modelPath ?? "/models/thor.glb", undefined, { enabled: modelPath === "thor" });

  const sceneToShow = avatarType === "hulk" ? hulkScene : avatarType === "thor" ? thorScene : null;

  if (!sceneToShow) {
    return (
      <Html center>
        <div className="text-center text-muted-foreground text-sm font-mono">
          No 3D model selected
        </div>
      </Html>
    );
  }

  return <primitive object={sceneToShow} scale={1.5} position={[0, -1, 0]} />;
}

export default function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
  return (
    <div className="space-y-4">
      {/* 3D Viewport – shows the currently selected avatar in realistic 3D */}
      <div className="border border-border neon-border rounded-md p-2 bg-card/50 backdrop-blur-sm h-64">
        <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 5, 3]} intensity={1} />
          <pointLight position={[-2, 3, 4]} intensity={0.5} />
          <Avatar3DView avatarType={selected} />
          <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={1.5} />
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* Original selector UI (extended to include Hulk & Thor) */}
      <div className="border border-border neon-border rounded-md p-3 bg-card/50 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 font-display">
          Avatar Overlay
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded border transition-all ${
                selected === avatar.id
                  ? "border-primary bg-primary/10 neon-border"
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              <span className="text-lg">{avatar.emoji}</span>
              <span
                className={`text-[8px] font-mono leading-tight text-center ${
                  selected === avatar.id ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {avatar.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
        {selected !== "none" && (
          <div className="mt-2 text-[10px] font-mono text-accent animate-pulse-neon">
            ● AVATAR ACTIVE — move to animate
          </div>
        )}
      </div>
    </div>
  );
}
