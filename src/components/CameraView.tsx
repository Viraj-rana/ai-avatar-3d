import { usePoseDetector } from "@/hooks/usePoseDetector";
import MetricsPanel from "@/components/MetricsPanel";

export default function CameraView() {
  const { videoRef, canvasRef, metrics, isLoading, error, cameraActive } = usePoseDetector();

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background">
          <div className="w-16 h-16 border-2 border-primary/30 border-t-primary rounded-full animate-spin neon-glow mb-4" />
          <p className="font-display text-sm tracking-[0.3em] text-primary neon-text animate-pulse-neon">
            INITIALIZING SCANNER
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Loading model & camera...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background p-6">
          <div className="w-16 h-16 rounded-full border-2 border-destructive flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="font-display text-sm tracking-[0.2em] text-destructive mb-2">
            SCANNER ERROR
          </p>
          <p className="text-xs text-muted-foreground text-center font-mono max-w-md">
            {error}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Please allow camera access and reload.
          </p>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative rounded-lg overflow-hidden neon-border border border-border">
        <video
          ref={videoRef}
          className="block max-h-[75vh] w-auto"
          playsInline
          muted
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Scan line overlay */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="scan-line w-full h-1/3" />
          </div>
        )}

        {/* Corner markers */}
        {cameraActive && (
          <>
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary/70" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary/70" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary/70" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary/70" />
          </>
        )}

        {/* Top HUD */}
        {cameraActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-sm px-3 py-1 rounded border border-border">
            <span className="text-[10px] font-display tracking-[0.3em] text-primary neon-text">
              ● LIVE SCAN
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
