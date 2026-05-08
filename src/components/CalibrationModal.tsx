import { useState } from "react";

interface CalibrationModalProps {
  onCalibrate: (heightCm: number) => void;
  hasBodyDetected: boolean;
}

export default function CalibrationModal({ onCalibrate, hasBodyDetected }: CalibrationModalProps) {
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState<"cm" | "ft">("cm");

  const handleSubmit = () => {
    let cm: number;
    if (unit === "ft") {
      const parts = height.split(/['".\s]+/).filter(Boolean);
      const feet = parseFloat(parts[0] || "0");
      const inches = parseFloat(parts[1] || "0");
      cm = Math.round(feet * 30.48 + inches * 2.54);
    } else {
      cm = parseFloat(height);
    }
    if (!cm || cm < 50 || cm > 300) return;
    onCalibrate(cm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="border border-border neon-border rounded-lg p-6 bg-card/90 backdrop-blur-md max-w-sm w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-neon neon-glow" />
          <h2 className="font-display text-xs tracking-[0.3em] uppercase text-primary neon-text">
            Calibration
          </h2>
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-5">
          Stand upright in full view of the camera, then enter your real height to calibrate all measurements.
        </p>

        {/* Body detection status */}
        <div className={`flex items-center gap-2 mb-4 p-2 rounded border ${hasBodyDetected ? "border-accent/50 bg-accent/5" : "border-destructive/50 bg-destructive/5"}`}>
          <div className={`w-2 h-2 rounded-full ${hasBodyDetected ? "bg-accent animate-pulse-neon" : "bg-destructive"}`} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${hasBodyDetected ? "text-accent" : "text-destructive"}`}>
            {hasBodyDetected ? "Body detected — ready to calibrate" : "No body detected — step into view"}
          </span>
        </div>

        {/* Unit toggle */}
        <div className="flex gap-1 mb-3">
          {(["cm", "ft"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-3 py-1 rounded text-[10px] font-display tracking-[0.2em] uppercase border transition-all ${
                unit === u
                  ? "border-primary bg-primary/10 text-primary neon-text"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {u === "cm" ? "CM" : "FT/IN"}
            </button>
          ))}
        </div>

        {/* Input */}
        <input
          type="text"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder={unit === "cm" ? "e.g. 175" : "e.g. 5'9"}
          className="w-full bg-secondary/50 border border-border rounded px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 neon-border mb-4"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!hasBodyDetected || !height}
          className="w-full py-2 rounded font-display text-xs tracking-[0.2em] uppercase transition-all border disabled:opacity-30 disabled:cursor-not-allowed border-primary bg-primary/10 text-primary hover:bg-primary/20 neon-glow"
        >
          Calibrate Scanner
        </button>

        {/* Skip */}
        <button
          onClick={() => onCalibrate(0)}
          className="w-full mt-2 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip — use rough estimates
        </button>
      </div>
    </div>
  );
}
