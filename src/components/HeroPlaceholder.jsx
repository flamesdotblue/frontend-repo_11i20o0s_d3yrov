import React from 'react';
import { Cube } from 'lucide-react';
import Spline from '@splinetool/react-spline';

export default function HeroPlaceholder() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/EF7JOSsHLk16Tlw9/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/20 to-gray-900/40 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-white/10 border border-white/20 mb-4">
          <Cube className="h-10 w-10 text-blue-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Depthmap to 3D Converter</h1>
        <p className="mt-2 text-white/70 max-w-md">
          Upload a PNG depthmap to begin. Adjust materials, lighting, and parameters to craft a navigable 3D model.
        </p>
      </div>
    </div>
  );
}
