import React, { useRef, useEffect } from 'react';

interface ScaledImageProps {
  imageUrl: string;
  width: number;
  height: number;
}

const ScaledImage: React.FC<ScaledImageProps> = ({ imageUrl, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = 'Anonymous'; // This is important for images from other domains
    image.src = imageUrl;

    image.onload = () => {
      canvas.width = width;
      canvas.height = height;

      // High-quality downscaling using stepping
      const steps = Math.ceil(Math.log2(Math.max(image.width / width, image.height / height)));

      let W = image.width;
      let H = image.height;
      const oc = document.createElement('canvas');
      const octx = oc.getContext('2d');

      if (!octx) return;

      oc.width = W;
      oc.height = H;
      octx.drawImage(image, 0, 0, W, H);

      if (steps > 1) {
          for (let i = 1; i < steps; i++) {
              const w = W * 0.5;
              const h = H * 0.5;
              octx.drawImage(oc, 0, 0, W, H, 0, 0, w, h);
              W = w;
              H = h;
          }
      }

      ctx.drawImage(oc, 0, 0, W, H, 0, 0, width, height);
      
      // A simple sharpening effect
      ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';
      ctx.drawImage(canvas, 0, 0); // Re-draw image with filter
      ctx.filter = 'none'; // Reset filter
    };

    image.onerror = () => {
        // Handle image loading error
        ctx.clearRect(0, 0, width, height);
    };

  }, [imageUrl, width, height]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default ScaledImage;