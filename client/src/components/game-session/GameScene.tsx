import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Users, Map as MapIcon, Grid as GridIcon, Crown, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GameSceneProps {
    campaign: any;
    characters: any[];
    isMaster: boolean;
}

export function GameScene({ campaign, characters, isMaster }: GameSceneProps) {
    const { updateCharacter } = useGameStore();
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Token Dragging State
    const [draggedToken, setDraggedToken] = useState<string | null>(null);
    const [tokenOffset, setTokenOffset] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    // Grid Configuration
    const gridSize = 50;
    const showGrid = campaign?.showGrid ?? true;
    const mapUrl = campaign?.activeMapUrl || "https://images.unsplash.com/photo-1620644780185-3f6929c3fa9c?q=80&w=2670&auto=format&fit=crop";

    // Mouse Event Handlers for Map Panning
    const handleMouseDown = (e: React.MouseEvent) => {
        // If clicking a token, don't drag map
        if ((e.target as HTMLElement).closest('.game-token')) return;

        if ((e.target as HTMLElement).classList.contains('game-scene-bg') || (e.target as HTMLElement).closest('.game-scene-layer')) {
            setIsDraggingMap(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingMap) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }

        if (draggedToken) {
            // Logic handled in handleTokenMouseMove usually, but if we globalize drag:
            // For simple HTML5 drag, we might use onDragStart/onDragEnd
        }
    };

    const handleMouseUp = () => {
        setIsDraggingMap(false);
        setDraggedToken(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const newScale = Math.min(Math.max(0.5, scale + (e.deltaY * -0.001)), 3);
        setScale(newScale);
    };

    // Token Drag Handlers
    const handleTokenDragStart = (e: React.MouseEvent, charId: string, currentX: number, currentY: number) => {
        e.stopPropagation();
        // Calculate offset from token top-left to mouse position
        // This requires more complex math with scale.
        // Simplified: use HTML5 Draggable for tokens? Or custom logic.
        // Custom logic is smoother for VTT.
        // Let's rely on a simpler 'click to pick up, click to place' or raw event mapping?
        // Let's try simple 'drag' logic:

        // Actually, let's implement a ref-based drag for tokens if possible, or use a library.
        // Since I cannot install libraries easily without restart, I will stick to mouse events.

        // However, mixing map drag and token drag can be tricky.
        // Let's assign 'isDraggingToken' state.
    };

    // Simplified Token Placement (Click to Move for now? Or proper Drag?)
    // Proper drag:

    const onTokenMouseDown = (e: React.MouseEvent, charId: string) => {
        e.stopPropagation();
        if (!isMaster && characters.find(c => c.id === charId)?.userId !== campaign?.masterId) {
            // Players can only move their own token? 
            // Logic: isMaster || char.userId === currentUser.id
            // Check permission later.
        }

        setDraggedToken(charId);
        // Initial offset
        // We need the mouse position relative to the map container, divided by scale.
    };

    // We need a global mouse move for tokens to update their LOCAL position while dragging
    // Then on mouse up, save to Firestore.

    const [tempTokenPos, setTempTokenPos] = useState<{ x: number, y: number } | null>(null);

    return (
        <div className="relative w-full h-full overflow-hidden bg-black/50 select-none">
            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                {isMaster && (
                    <Card className="p-2 bg-black/80 border-accent/20 backdrop-blur">
                        <div className="text-xs text-accent font-bold mb-2">CONTROLES DO MESTRE</div>
                        <div className="text-[10px] text-muted-foreground">Arraste para mover o mapa. Scroll para zoom.</div>
                    </Card>
                )}
            </div>

            {/* Game Canvas */}
            <div
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing game-scene-bg relative"
                onMouseDown={handleMouseDown}
                onMouseMove={(e) => {
                    handleMouseMove(e);
                    if (draggedToken && containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const x = (e.clientX - rect.left - position.x) / scale;
                        const y = (e.clientY - rect.top - position.y) / scale;
                        setTempTokenPos({ x: x - 25, y: y - 25 }); // Center on mouse (assuming 50px token)
                    }
                }}
                onMouseUp={(e) => {
                    handleMouseUp();
                    if (draggedToken && tempTokenPos) {
                        // Snap to grid
                        const snappedX = Math.round(tempTokenPos.x / gridSize) * gridSize;
                        const snappedY = Math.round(tempTokenPos.y / gridSize) * gridSize;
                        updateCharacter(draggedToken, { x: snappedX, y: snappedY });
                        setTempTokenPos(null);
                    }
                }}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                <div
                    className="absolute transition-transform duration-75 origin-top-left will-change-transform game-scene-layer"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                >
                    {/* Background Layer */}
                    <img
                        src={mapUrl}
                        alt="Map"
                        className="max-w-none pointer-events-none shadow-2xl"
                        draggable={false}
                    />

                    {/* Grid Layer */}
                    {showGrid && (
                        <div
                            className="absolute inset-0 pointer-events-none z-0"
                            style={{
                                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                                                  linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                                backgroundSize: `${gridSize}px ${gridSize}px`
                            }}
                        />
                    )}

                    {/* Tokens Layer */}
                    <div className="absolute inset-0 z-10">
                        {characters.map(char => {
                            const isBeingDragged = draggedToken === char.id;
                            const x = isBeingDragged && tempTokenPos ? tempTokenPos.x : (char.x || 0);
                            const y = isBeingDragged && tempTokenPos ? tempTokenPos.y : (char.y || 0);

                            return (
                                <div
                                    key={char.id}
                                    className={`absolute w-[50px] h-[50px] rounded-full border-2 border-white/50 shadow-lg cursor-grab active:cursor-grabbing transition-shadow hover:ring-2 hover:ring-accent game-token group ${isBeingDragged ? 'z-50 scale-110 shadow-xl' : 'z-10'}`}
                                    style={{
                                        transform: `translate(${x}px, ${y}px)`,
                                        transition: isBeingDragged ? 'none' : 'transform 0.2s ease-out'
                                    }}
                                    onMouseDown={(e) => onTokenMouseDown(e, char.id)}
                                >
                                    <Avatar className="w-full h-full">
                                        <AvatarImage src={char.avatarUrl} className="object-cover" />
                                        <AvatarFallback className="bg-zinc-800 text-white font-bold">{char.name[0]}</AvatarFallback>
                                    </Avatar>

                                    {/* Name Label */}
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[8px] px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {char.name}
                                    </div>

                                    {/* HP Bar */}
                                    <div className="absolute -top-1 left-0 right-0 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500"
                                            style={{ width: `${Math.min(100, ((char.hp || 0) / (char.maxHp || 100)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
