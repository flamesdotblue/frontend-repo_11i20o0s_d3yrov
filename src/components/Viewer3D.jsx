import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function createProceduralEnvMap(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
  camera.position.z = 3;

  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.5, 32, 32);
  const colors = [
    new THREE.Color('#6ee7ff'),
    new THREE.Color('#a78bfa'),
    new THREE.Color('#22d3ee'),
    new THREE.Color('#fde68a'),
    new THREE.Color('#60a5fa'),
    new THREE.Color('#f472b6'),
  ];
  for (let i = 0; i < 6; i++) {
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
    );
    const theta = (i / 6) * Math.PI * 2;
    mesh.position.set(Math.cos(theta) * 1.2, Math.sin(theta) * 0.8, (i % 2 === 0 ? 1 : -1) * 0.6);
    group.add(mesh);
  }
  scene.add(group);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(scene, 0.5);
  const texture = rt.texture;

  // Cleanup intermediate resources
  pmrem.dispose();
  scene.traverse((obj) => {
    if (obj.isMesh) obj.geometry.dispose();
  });

  return texture;
}

function buildMaterial(preset, envMap) {
  const common = { envMap, envMapIntensity: 1.0 }; 
  switch (preset) {
    case 'metal':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cfd8e3'),
        metalness: 1.0,
        roughness: 0.2,
        ...common,
      });
    case 'wood':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8b5a2b'),
        metalness: 0.0,
        roughness: 0.85,
        ...common,
        envMapIntensity: 0.2,
      });
    case 'plastic':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        metalness: 0.0,
        roughness: 0.3,
        ...common,
      });
    case 'antique':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#b08d57'),
        metalness: 1.0,
        roughness: 0.35,
        ...common,
      });
    case 'standard':
    default:
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f3f4f6'),
        metalness: 0.2,
        roughness: 0.5,
        ...common,
      });
  }
}

function applyLighting(scene, type) {
  // Clear existing lights
  const toRemove = [];
  scene.traverse((obj) => {
    if (obj.isLight) toRemove.push(obj);
  });
  toRemove.forEach((l) => scene.remove(l));

  switch (type) {
    case 'studio': {
      const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.6);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, 1.0);
      key.position.set(2, 2, 3);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x99aaff, 0.5);
      fill.position.set(-3, 1, -2);
      scene.add(fill);
      break;
    }
    case 'outdoor': {
      const hemi = new THREE.HemisphereLight(0xddf1ff, 0x223344, 1.0);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(5, 10, 5);
      scene.add(sun);
      break;
    }
    case 'dramatic': {
      const key = new THREE.SpotLight(0xffffff, 2.0, 0, Math.PI / 6, 0.25, 1);
      key.position.set(3, 5, 2);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
      rim.position.set(-2, 1, -3);
      scene.add(rim);
      break;
    }
    case 'none':
    default: {
      const amb = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(amb);
      break;
    }
  }
}

function computeHeightmapFromImage(img, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size).data;
  const heights = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = imgData[i * 4 + 0];
    const g = imgData[i * 4 + 1];
    const b = imgData[i * 4 + 2];
    // luminance approximation
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    heights[i] = lum; // 0..1
  }
  return heights;
}

function buildGeometryFromHeightmap(heights, segments, size, thickness) {
  const grid = segments + 1; // vertices per side
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const pos = geometry.attributes.position;
  // Elevate Z based on heightmap
  for (let iy = 0; iy < grid; iy++) {
    for (let ix = 0; ix < grid; ix++) {
      const idx = iy * grid + ix;
      const z = heights[idx] * thickness * size * 2.0; // scale depth with size, thickness
      pos.setZ(idx, z - (thickness * size)); // center around 0 a bit
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function exportBinarySTL(bufferGeometry, meshMatrixWorld, name = 'model.stl') {
  const geom = bufferGeometry.index ? bufferGeometry.toNonIndexed() : bufferGeometry.clone();
  geom.computeVertexNormals();
  const posAttr = geom.getAttribute('position');
  const normalAttr = geom.getAttribute('normal');
  const triangleCount = posAttr.count / 3;

  // 80-byte header + 4-byte triangle count + triangles (50 bytes each)
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const dv = new DataView(buffer);

  // header left as zeros
  dv.setUint32(80, triangleCount, true);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < triangleCount; i++) {
    vA.fromBufferAttribute(posAttr, i * 3 + 0).applyMatrix4(meshMatrixWorld);
    vB.fromBufferAttribute(posAttr, i * 3 + 1).applyMatrix4(meshMatrixWorld);
    vC.fromBufferAttribute(posAttr, i * 3 + 2).applyMatrix4(meshMatrixWorld);

    // compute face normal
    n.copy(vC).sub(vB).cross(vA.clone().sub(vB)).normalize();

    const offset = 84 + i * 50;
    dv.setFloat32(offset + 0, n.x, true);
    dv.setFloat32(offset + 4, n.y, true);
    dv.setFloat32(offset + 8, n.z, true);

    dv.setFloat32(offset + 12, vA.x, true);
    dv.setFloat32(offset + 16, vA.y, true);
    dv.setFloat32(offset + 20, vA.z, true);

    dv.setFloat32(offset + 24, vB.x, true);
    dv.setFloat32(offset + 28, vB.y, true);
    dv.setFloat32(offset + 32, vB.z, true);

    dv.setFloat32(offset + 36, vC.x, true);
    dv.setFloat32(offset + 40, vC.y, true);
    dv.setFloat32(offset + 44, vC.z, true);

    dv.setUint16(offset + 48, 0, true);
  }

  const blob = new Blob([buffer], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Viewer3D({
  file,
  size = 1.0,
  thickness = 0.04,
  detail = 1536,
  material = 'metal',
  lighting = 'outdoor',
  autoRotate = true,
  onActionsReady,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshRef = useRef(null);
  const envMapRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Init Three.js once
  useEffect(() => {
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x333333);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0.8, 0.8, 1.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // Env map
    envMapRef.current = createProceduralEnvMap(renderer);

    let raf;
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      // gentle auto-rotate oscillation
      if (autoRotate && meshRef.current) {
        const t = clock.getElapsedTime();
        const range = THREE.MathUtils.degToRad(30);
        meshRef.current.rotation.y = Math.sin(t * 0.5) * range;
      }
      renderer.render(scene, camera);
    };
    animate();

    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (envMapRef.current) envMapRef.current.dispose?.();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update lighting when changed
  useEffect(() => {
    if (!ready) return;
    applyLighting(sceneRef.current, lighting);
  }, [lighting, ready]);

  // Build or rebuild mesh when parameters or file change
  useEffect(() => {
    if (!ready) return;
    const scene = sceneRef.current;

    // Remove previous mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      meshRef.current.material.dispose();
      meshRef.current = null;
    }

    if (!file) {
      onActionsReady?.(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const segments = Math.max(2, Math.min(2048, detail)) - 1; // PlaneGeometry segs = vertices-1
        const grid = segments + 1;
        const heights = computeHeightmapFromImage(img, grid);
        const geom = buildGeometryFromHeightmap(heights, segments, size, thickness);
        const mat = buildMaterial(material, envMapRef.current);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2; // lay flat then orbit feels intuitive
        scene.add(mesh);
        meshRef.current = mesh;

        // Prepare actions
        const screenshot = () => {
          const renderer = rendererRef.current;
          const camera = cameraRef.current;
          const container = containerRef.current;
          const targetWidth = 2048;
          const aspect = container.clientWidth / container.clientHeight;
          const targetHeight = Math.round(targetWidth / aspect);
          const prevSize = renderer.getSize(new THREE.Vector2());
          const prevPixelRatio = renderer.getPixelRatio();

          renderer.setPixelRatio(1);
          renderer.setSize(targetWidth, targetHeight, false);
          renderer.render(sceneRef.current, camera);
          const dataURL = renderer.domElement.toDataURL('image/png');

          // restore
          renderer.setPixelRatio(prevPixelRatio);
          renderer.setSize(prevSize.x, prevSize.y, false);

          const a = document.createElement('a');
          a.href = dataURL;
          a.download = 'screenshot-2k.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
        };

        const downloadSTL = () => {
          const geomWorld = mesh.geometry.clone();
          exportBinarySTL(geomWorld, mesh.matrixWorld, 'depthmap-model.stl');
          geomWorld.dispose();
        };

        onActionsReady?.({ screenshot, downloadSTL });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, size, thickness, detail, material, ready]);

  // Update material on material change without rebuilding geometry
  useEffect(() => {
    if (!ready || !meshRef.current) return;
    const newMat = buildMaterial(material, envMapRef.current);
    const old = meshRef.current.material;
    meshRef.current.material = newMat;
    old.dispose();
  }, [material, ready]);

  return <div ref={containerRef} className="relative w-full h-full" />;
}
