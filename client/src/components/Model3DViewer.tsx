import { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, useGLTF } from '@react-three/drei';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Loader2, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Model3DViewerProps {
    modelUrl?: string;
    className?: string;
}

function Model({ url }: { url: string }) {
    const meshRef = useRef<any>();
    const { scene } = useGLTF(url);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
        }
    });

    return <primitive ref={meshRef} object={scene} scale={1.5} />;
}

function Fallback3D() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#EAB308" metalness={0.8} roughness={0.2} />
        </mesh>
    );
}

export function Model3DViewer({ modelUrl, className = '' }: Model3DViewerProps) {
    const [zoom, setZoom] = useState(5);
    const [autoRotate, setAutoRotate] = useState(true);
    const controlsRef = useRef<any>();

    const handleReset = () => {
        setZoom(5);
        setAutoRotate(true);
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
    };

    return (
        <Card className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-accent/30 ${className}`}>
            {/* 3D Canvas */}
            <div className="w-full h-full">
                <Canvas shadows>
                    <PerspectiveCamera makeDefault position={[0, 0, zoom]} />
                    
                    {/* Lighting */}
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                    <pointLight position={[-10, -10, -5]} intensity={0.5} color="#EAB308" />
                    <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} castShadow color="#EAB308" />
                    
                    {/* Environment */}
                    <Environment preset="sunset" />
                    
                    {/* Model */}
                    <Suspense fallback={<Fallback3D />}>
                        {modelUrl ? (
                            <Model url={modelUrl} />
                        ) : (
                            <Fallback3D />
                        )}
                    </Suspense>
                    
                    {/* Controls */}
                    <OrbitControls
                        ref={controlsRef}
                        enableZoom={true}
                        enablePan={false}
                        autoRotate={autoRotate}
                        autoRotateSpeed={2}
                        minDistance={2}
                        maxDistance={10}
                    />
                </Canvas>
            </div>

            {/* Loading Overlay */}
            {!modelUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Carregando modelo 3D...</p>
                    </div>
                </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 border-accent/20"
                        onClick={() => setZoom(Math.max(2, zoom - 1))}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 border-accent/20"
                        onClick={() => setZoom(Math.min(10, zoom + 1))}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        className={`h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 border-accent/20 ${autoRotate ? 'text-accent' : ''}`}
                        onClick={() => setAutoRotate(!autoRotate)}
                    >
                        <RotateCcw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 border-accent/20"
                        onClick={handleReset}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                </div>

                <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-accent/20 pointer-events-auto">
                    <p className="text-[10px] text-accent font-mono">Arraste para rotacionar • Scroll para zoom</p>
                </div>
            </div>

            {/* Corner Badge */}
            <div className="absolute top-3 right-3 bg-accent/20 backdrop-blur-sm px-3 py-1 rounded-full border border-accent/30">
                <p className="text-[10px] text-accent font-bold uppercase tracking-wider">Modelo 3D</p>
            </div>
        </Card>
    );
}
