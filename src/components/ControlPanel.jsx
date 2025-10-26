import React, { useRef } from 'react';
import { Upload, Camera, Download, Settings, Square, Circle, Star, Diamond, Cube } from 'lucide-react';

const MaterialButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`group flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition ${
      active ? 'ring-2 ring-blue-500/60' : ''
    }`}
    title={label}
  >
    <Icon className={`h-6 w-6 ${active ? 'text-blue-400' : 'text-white/80'}`} />
    <span className="text-xs text-white/70">{label}</span>
  </button>
);

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold tracking-wide text-white/90">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

export default function ControlPanel({
  hasModel,
  defaults,
  onUpload,
  material,
  setMaterial,
  lighting,
  setLighting,
  autoRotate,
  setAutoRotate,
  size,
  setSize,
  thickness,
  setThickness,
  detail,
  setDetail,
  onScreenshot,
  onDownloadSTL,
}) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'image/png') {
      onUpload(file);
    }
  };

  const handleBrowse = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'image/png') {
      onUpload(file);
    }
  };

  return (
    <aside
      className="w-[288px] shrink-0 h-screen overflow-hidden border-r border-white/20 bg-gray-900/10 backdrop-blur-3xl text-white p-5 flex flex-col gap-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Controls</h2>
        </div>
        <p className="text-xs text-white/70">Adjust and export your model</p>
      </header>

      <Section title="File Upload">
        <div
          className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition p-6 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-blue-400" />
          <p className="text-sm text-white/80">Upload PNG file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={handleBrowse}
          />
        </div>
      </Section>

      <Section title="Customize">
        <div className="grid grid-cols-5 gap-2">
          <MaterialButton
            icon={Square}
            label="Standard"
            active={material === 'standard'}
            onClick={() => setMaterial('standard')}
          />
          <MaterialButton
            icon={Diamond}
            label="Metal"
            active={material === 'metal'}
            onClick={() => setMaterial('metal')}
          />
          <MaterialButton
            icon={Star}
            label="Wood"
            active={material === 'wood'}
            onClick={() => setMaterial('wood')}
          />
          <MaterialButton
            icon={Circle}
            label="Plastic"
            active={material === 'plastic'}
            onClick={() => setMaterial('plastic')}
          />
          <MaterialButton
            icon={Cube}
            label="Antique"
            active={material === 'antique'}
            onClick={() => setMaterial('antique')}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/70">Lighting</label>
          <select
            value={lighting}
            onChange={(e) => setLighting(e.target.value)}
            className="w-full rounded-md bg-white/10 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            <option value="studio">Studio</option>
            <option value="outdoor">Outdoor</option>
            <option value="dramatic">Dramatic</option>
            <option value="none">None</option>
          </select>
        </div>
      </Section>

      <Section title="Effects">
        <div className="flex items-center justify-between">
          <span className="text-sm">Auto-rotate</span>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              autoRotate ? 'bg-blue-500/60' : 'bg-white/20'
            }`}
            role="switch"
            aria-checked={autoRotate}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                autoRotate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Section>

      <Section title="Parameters">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Size</span>
            <span>{size.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={size}
            onChange={(e) => setSize(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Thickness</span>
            <span>{thickness.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min={0.02}
            max={0.06}
            step={0.001}
            value={thickness}
            onChange={(e) => setThickness(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Model Detail</span>
            <span>{detail}</span>
          </div>
          <input
            type="range"
            min={1024}
            max={2048}
            step={32}
            value={detail}
            onChange={(e) => setDetail(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </Section>

      <Section title="Export">
        <div className="grid grid-cols-1 gap-2">
          <button
            disabled={!hasModel}
            onClick={onScreenshot}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition border ${
              hasModel
                ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-100'
                : 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
            }`}
          >
            <Camera className="h-4 w-4" /> Screenshot PNG (2k)
          </button>
          <button
            disabled={!hasModel}
            onClick={onDownloadSTL}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition border ${
              hasModel
                ? 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-100'
                : 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
            }`}
          >
            <Download className="h-4 w-4" /> Download STL
          </button>
        </div>
      </Section>

      <div className="mt-auto text-[10px] text-white/50">
        Defaults: Material {defaults.material}, Lighting {defaults.lighting}, Auto-rotate {defaults.autoRotate ? 'On' : 'Off'}
      </div>
    </aside>
  );
}
