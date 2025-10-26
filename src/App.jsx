import React, { useMemo, useRef, useState } from 'react';
import ControlPanel from './components/ControlPanel.jsx';
import Viewer3D from './components/Viewer3D.jsx';
import HeroPlaceholder from './components/HeroPlaceholder.jsx';

export default function App() {
  const defaults = useMemo(() => ({
    material: 'metal',
    lighting: 'outdoor',
    autoRotate: true,
    size: 1.0,
    thickness: 0.04,
    detail: 1536,
  }), []);

  const [file, setFile] = useState(null);
  const [material, setMaterial] = useState(defaults.material);
  const [lighting, setLighting] = useState(defaults.lighting);
  const [autoRotate, setAutoRotate] = useState(defaults.autoRotate);
  const [size, setSize] = useState(defaults.size);
  const [thickness, setThickness] = useState(defaults.thickness);
  const [detail, setDetail] = useState(defaults.detail);

  const actionsRef = useRef(null);

  const hasModel = !!file;

  const handleActionsReady = (handlers) => {
    actionsRef.current = handlers;
  };

  const gradientBg = 'bg-gradient-to-br from-gray-900 via-purple-900/50 to-slate-900';

  return (
    <div className={`font-inter ${gradientBg} text-white h-screen w-screen overflow-hidden`}> 
      <div className="flex h-full w-full">
        <ControlPanel
          hasModel={hasModel}
          defaults={defaults}
          onUpload={(f) => setFile(f)}
          material={material}
          setMaterial={setMaterial}
          lighting={lighting}
          setLighting={setLighting}
          autoRotate={autoRotate}
          setAutoRotate={setAutoRotate}
          size={size}
          setSize={setSize}
          thickness={thickness}
          setThickness={setThickness}
          detail={detail}
          setDetail={setDetail}
          onScreenshot={() => actionsRef.current?.screenshot?.()}
          onDownloadSTL={() => actionsRef.current?.downloadSTL?.()}
        />

        <main className="relative flex-1 h-screen">
          {!hasModel ? (
            <HeroPlaceholder />
          ) : (
            <Viewer3D
              file={file}
              size={size}
              thickness={thickness}
              detail={detail}
              material={material}
              lighting={lighting}
              autoRotate={autoRotate}
              onActionsReady={handleActionsReady}
            />
          )}
        </main>
      </div>
    </div>
  );
}
