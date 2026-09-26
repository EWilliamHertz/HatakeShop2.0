import React, { useEffect, useRef } from "react";
import createGlobe from "cobe";

export const Globe = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 800,
      height: 800,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.1, 0.1, 0.2],
      markerColor: [0.1, 0.8, 1],
      glowColor: [0.05, 0.1, 0.2],
      markers: [
        // Tokyo
        { location: [35.6762, 139.6503], size: 0.1 },
        // London
        { location: [51.5074, -0.1278], size: 0.1 },
        // New York
        { location: [40.7128, -74.0060], size: 0.1 },
        // Paris
        { location: [48.8566, 2.3522], size: 0.05 },
        // Dubai
        { location: [25.2048, 55.2708], size: 0.08 }
      ],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = phi;
        phi += 0.005;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden pointer-events-none">
      <canvas
        ref={canvasRef}
        style={{
          width: 400,
          height: 400,
          maxWidth: "100%",
          aspectRatio: 1
        }}
      />
    </div>
  );
};
