import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Sword, Map as MapIcon, Users, Dices, Crown, BookOpen, Package } from "lucide-react";
import { useEffect } from "react";

interface ToolsMenuProps {
    isMaster: boolean;
    activeTool: string | null;
    onSelectTool: (tool: string | null) => void;
}

export function ToolsMenu({ isMaster, activeTool, onSelectTool }: ToolsMenuProps) {
    const handleToolClick = (tool: string) => {
        onSelectTool(activeTool === tool ? null : tool);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only trigger if not typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            const key = e.key.toLowerCase();
            
            if (isMaster) {
                switch(key) {
                    case '1': handleToolClick('inspector'); break;
                    case '2': handleToolClick('journal'); break;
                    case '3': handleToolClick('dice'); break;
                    case '4': handleToolClick('scenes'); break;
                    case '5': handleToolClick('party'); break;
                    case '6': handleToolClick('initiative'); break;
                    case 'escape': onSelectTool(null); break;
                }
            } else {
                switch(key) {
                    case '1': handleToolClick('sheet'); break;
                    case '2': handleToolClick('inventory'); break;
                    case '3': handleToolClick('journal'); break;
                    case '4': handleToolClick('dice'); break;
                    case 'escape': onSelectTool(null); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isMaster, activeTool]);

    const masterTools = [
        { id: 'inspector', icon: Settings, label: 'Inspetor', desc: 'Gerenciar personagens', key: '1', gradient: 'from-purple-900/20' },
        { id: 'journal', icon: BookOpen, label: 'Diário', desc: 'Anotações da sessão', key: '2', gradient: 'from-blue-900/20' },
        { id: 'dice', icon: Dices, label: 'Dados', desc: 'Rolador de dados', key: '3', gradient: 'from-green-900/20' },
        { id: 'scenes', icon: MapIcon, label: 'Cenas', desc: 'Mapas e cenários', key: '4', gradient: 'from-amber-900/20' },
        { id: 'party', icon: Users, label: 'Grupo', desc: 'Visão geral do grupo', key: '5', gradient: 'from-red-900/20' },
        { id: 'initiative', icon: Sword, label: 'Iniciativa', desc: 'Ordem de combate', key: '6', gradient: 'from-orange-900/20' },
    ];

    const playerTools = [
        { id: 'sheet', icon: Shield, label: 'Ficha', desc: 'Sua ficha de personagem', key: '1', gradient: 'from-blue-900/20' },
        { id: 'inventory', icon: Package, label: 'Inventário', desc: 'Seus itens e equipamentos', key: '2', gradient: 'from-purple-900/20' },
        { id: 'journal', icon: BookOpen, label: 'Diário', desc: 'Anotações da sessão', key: '3', gradient: 'from-green-900/20' },
        { id: 'dice', icon: Dices, label: 'Dados', desc: 'Rolador de dados', key: '4', gradient: 'from-amber-900/20' },
    ];

    const tools = isMaster ? masterTools : playerTools;

    return (
        <TooltipProvider>
            <div className="grid grid-cols-2 gap-2">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    
                    return (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                <Button 
                                    onClick={() => handleToolClick(tool.id)} 
                                    variant="outline" 
                                    className={`
                                        border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 
                                        relative group overflow-hidden transition-all duration-300
                                        ${isActive ? 'bg-accent/20 text-accent border-accent/50 shadow-[0_0_15px_rgba(251,191,36,0.1)] scale-[1.02]' : ''}
                                    `}
                                >
                                    {/* Gradient Overlay */}
                                    <div className={`
                                        absolute inset-0 bg-gradient-to-br ${tool.gradient} to-transparent 
                                        opacity-0 group-hover:opacity-100 transition-opacity duration-300
                                    `} />
                                    
                                    {/* Active Indicator */}
                                    {isActive && (
                                        <div className="absolute top-1 right-1">
                                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                                        </div>
                                    )}
                                    
                                    {/* Icon */}
                                    <Icon className={`w-6 h-6 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'animate-pulse' : ''}`} />
                                    
                                    {/* Label */}
                                    <span className="text-xs font-semibold relative z-10">{tool.label}</span>
                                    
                                    {/* Keyboard Shortcut Badge */}
                                    <Badge 
                                        variant="outline" 
                                        className="absolute bottom-1 right-1 h-4 px-1 text-[9px] border-white/20 bg-black/50 backdrop-blur"
                                    >
                                        {tool.key}
                                    </Badge>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-slate-900 border-accent/30">
                                <div className="text-center">
                                    <p className="font-bold text-accent">{tool.label}</p>
                                    <p className="text-xs text-muted-foreground">{tool.desc}</p>
                                    <p className="text-[10px] text-accent/70 mt-1">Atalho: <kbd className="bg-white/10 px-1 rounded">{tool.key}</kbd></p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
            
            {/* Help Text */}
            <div className="mt-3 text-center">
                <p className="text-[10px] text-muted-foreground">
                    Use teclas <kbd className="bg-white/5 px-1 rounded">1-{tools.length}</kbd> ou <kbd className="bg-white/5 px-1 rounded">ESC</kbd> para fechar
                </p>
            </div>
        </TooltipProvider>
    );
}
