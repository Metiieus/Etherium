import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Shield, Sword, Map as MapIcon, Users, Dices, Crown } from "lucide-react";

interface ToolsMenuProps {
    isMaster: boolean;
    activeTool: string | null;
    onSelectTool: (tool: string | null) => void;
}

export function ToolsMenu({ isMaster, activeTool, onSelectTool }: ToolsMenuProps) {
    const handleToolClick = (tool: string) => {
        onSelectTool(activeTool === tool ? null : tool);
    };

    return (
        <div className="grid grid-cols-2 gap-2">
            {isMaster ? (
                <>
                    <Button onClick={() => handleToolClick('inspector')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 relative group overflow-hidden ${activeTool === 'inspector' ? 'bg-accent/10 text-accent' : ''}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Settings className="w-6 h-6" /><span className="text-xs">Inspetor</span>
                    </Button>
                    <Button onClick={() => handleToolClick('journal')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'journal' ? 'bg-accent/10 text-accent' : ''}`}><ScrollArea className="w-6 h-6" /><span className="text-xs">Diário</span></Button>
                    <Button onClick={() => handleToolClick('dice')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'dice' ? 'bg-accent/10 text-accent' : ''}`}><Dices className="w-6 h-6" /><span className="text-xs">Dados</span></Button>
                    <Button onClick={() => handleToolClick('scenes')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'scenes' ? 'bg-accent/10 text-accent' : ''}`}><MapIcon className="w-6 h-6" /><span className="text-xs">Cenas</span></Button>
                    <Button onClick={() => handleToolClick('party')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'party' ? 'bg-accent/10 text-accent' : ''}`}><Users className="w-6 h-6" /><span className="text-xs">Grupo</span></Button>
                    <Button onClick={() => handleToolClick('initiative')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'initiative' ? 'bg-accent/10 text-accent' : ''}`}><Sword className="w-6 h-6" /><span className="text-xs">Iniciativa</span></Button>
                </>
            ) : (
                <>
                    <Button onClick={() => handleToolClick('sheet')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 relative group overflow-hidden ${activeTool === 'sheet' ? 'bg-accent/10 text-accent' : ''}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Shield className="w-6 h-6" /><span className="text-xs">Ficha</span>
                    </Button>
                    <Button onClick={() => handleToolClick('inventory')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'inventory' ? 'bg-accent/10 text-accent' : ''}`}><Sword className="w-6 h-6" /><span className="text-xs">Inventário</span></Button>
                    <Button onClick={() => handleToolClick('journal')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'journal' ? 'bg-accent/10 text-accent' : ''}`}><ScrollArea className="w-6 h-6" /><span className="text-xs">Diário</span></Button>
                    <Button onClick={() => handleToolClick('dice')} variant="outline" className={`border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 ${activeTool === 'dice' ? 'bg-accent/10 text-accent' : ''}`}><Dices className="w-6 h-6" /><span className="text-xs">Dados</span></Button>
                </>
            )}
        </div>
    );
}
