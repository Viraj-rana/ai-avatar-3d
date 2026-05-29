import { type BodyMetrics } from "@/hooks/usePoseDetector";

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  status?: "active" | "inactive" | "warn";
}
//function
function MetricCard({ label, value, unit, status = "active" }: MetricCardProps) {
  const statusColor =
    status === "active"
      ? "text-primary neon-text"
      : status === "warn"
      ? "text-neon-warn"
      : "text-muted-foreground";

  return (
    <div className="border border-border neon-border rounded-md p-3 bg-card/50 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-display">
        {label}
      </div>
      <div className={`text-xl font-bold font-mono ${statusColor} animate-data-flicker`}>
        {value !== null && value !== undefined ? (
          <>
            {value}
            {unit && <span className="text-xs ml-1 text-muted-foreground">{unit}</span>}
          </>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  label: string;
  active: boolean;
}

function StatusIndicator({ label, active }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          active ? "bg-primary neon-glow animate-pulse-neon" : "bg-muted-foreground/30"
        }`}
      />
      <span
        className={`text-xs font-mono ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

interface MetricsPanelProps {
  metrics: BodyMetrics;
  cameraActive: boolean;
  isCalibrated: boolean;
}

export default function MetricsPanel({ metrics, cameraActive, isCalibrated }: MetricsPanelProps) {
  const unit = isCalibrated ? "cm" : "~cm";
  const poseEmoji =
    metrics.pose === "standing"
      ? "🧍"
      : metrics.pose === "sitting"
      ? "🪑"
      : metrics.pose === "walking"
      ? "🚶"
      : "❓";

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs">
      {/* Header */}
      <div className="border border-border neon-border rounded-md p-3 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-xs tracking-[0.2em] uppercase text-primary neon-text">
            Body Scanner
          </h2>
          <div className={`w-2 h-2 rounded-full ${cameraActive ? "bg-accent animate-pulse-neon neon-glow" : "bg-destructive"}`} />
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          CONFIDENCE: <span className="text-foreground">{metrics.confidence}%</span>
          {isCalibrated && <span className="text-accent ml-2">● CALIBRATED</span>}
        </div>
      </div>

      {/* Body Metrics */}
      <MetricCard label="Height" value={metrics.height} unit={unit} />
      
      <MetricCard
        label="Pose"
        value={metrics.pose !== "unknown" ? `${poseEmoji} ${metrics.pose.toUpperCase()}` : null}
        status={metrics.pose !== "unknown" ? "active" : "inactive"}
      />

      <MetricCard label="Shoulder Width" value={metrics.shoulderWidth} unit={unit} />
      <MetricCard label="Torso Length" value={metrics.torsoLength} unit={unit} />
      <MetricCard label="Leg Length" value={metrics.legLength} unit={unit} />
      <MetricCard label="Arm Span" value={metrics.armSpan} unit={unit} />

      {/* Hand Status */}
      <div className="border border-border neon-border rounded-md p-3 bg-card/50 backdrop-blur-sm">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 font-display">
          Hand Detection
        </div>
        <div className="flex flex-col gap-1.5">
          <StatusIndicator label="LEFT HAND RAISED" active={metrics.leftHandRaised} />
          <StatusIndicator label="RIGHT HAND RAISED" active={metrics.rightHandRaised} />
        </div>
      </div>

      {/* Head Tilt */}
      <MetricCard
        label="Head Tilt"
        value={metrics.headTilt.toUpperCase()}
        status={metrics.headTilt !== "center" ? "warn" : "active"}
      />
    </div>
  );
}
