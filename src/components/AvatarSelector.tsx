import { AVATARS, type AvatarType } from "@/lib/avatarRenderer";

interface AvatarSelectorProps {
  selected: AvatarType;
  onSelect: (avatar: AvatarType) => void;
}

export default function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
  return (
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
  );
}
