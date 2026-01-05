import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Dices, Trash2, ArrowDownUp, Play, Plus, Skull, Heart } from "lucide-react";
import { useState } from "react";

interface InitiativePanelProps {
    campaign: any;
    characters: any[];
    isMaster: boolean;
    onAdd: (name: string, value: number) => void;
    onRemove: (id: string) => void;
    onNext: () => void;
    onSort: () => void;
    onReset: () => void;
}

export function InitiativePanel({ campaign, characters, isMaster, onAdd, onRemove, onNext, onSort, onReset }: InitiativePanelProps) {
    const [newInitName, setNewInitName] = useState("");
    const [newInitValue, setNewInitValue] = useState(0);

    // Helper to find character data by name
    const getCharacterByName = (name: string) => {
        return characters.find((c: any) => c.name === name);
    };

    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
                {/* Toolbar for Master */}
                {isMaster && (
                    <div className="flex flex-col gap-2 shrink-0 bg-black/30 p-2 rounded border border-white/5">
                        <div className="flex gap-2">
                            <Input
                                className="h-7 text-xs flex-1 bg-black/50 border-white/10"
                                placeholder="Nome (Monstro/NPC)"
                                value={newInitName}
                                onChange={e => setNewInitName(e.target.value)}
                            />
                            <Input
                                type="number"
                                className="h-7 text-xs w-16 bg-black/50 border-white/10"
                                placeholder="Val"
                                value={newInitValue}
                                onChange={e => setNewInitValue(Number(e.target.value))}
                            />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        className="h-7 w-7 p-0" 
                                        onClick={() => { 
                                            if (newInitName.trim()) {
                                                onAdd(newInitName, newInitValue); 
                                                setNewInitName(""); 
                                                setNewInitValue(0); 
                                            }
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Adicionar à iniciativa</TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="flex gap-2 justify-between mt-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={onReset}>
                                        <Trash2 className="w-3 h-3 mr-1" /> Limpar
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Limpar toda a iniciativa</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={onSort}>
                                        <ArrowDownUp className="w-3 h-3 mr-1" /> Ordenar
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ordenar por valor (maior primeiro)</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" className="h-7 bg-accent text-black font-bold text-xs hover:bg-yellow-500" onClick={onNext}>
                                        <Play className="w-3 h-3 mr-1" /> Próximo
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Avançar para o próximo turno</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                )}

                {/* Initiative List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-2">
                    {campaign?.initiativeList?.length > 0 ? (
                        campaign.initiativeList.map((entry: any, index: number) => {
                            const char = getCharacterByName(entry.name);
                            const isCurrent = index === (campaign.currentTurnIndex || 0);
                            
                            return (
                                <div
                                    key={entry.id}
                                    className={`
                                        flex items-center gap-3 p-2 rounded border transition-all duration-300
                                        ${isCurrent
                                            ? 'bg-accent/20 border-accent/50 scale-[1.02] shadow-[0_0_15px_rgba(251,191,36,0.2)] ring-1 ring-accent/30'
                                            : 'bg-black/20 border-white/5 opacity-80 hover:opacity-100'}
                                    `}
                                >
                                    {/* Avatar */}
                                    <Avatar className={`h-10 w-10 border-2 ${isCurrent ? 'border-accent' : 'border-white/10'}`}>
                                        <AvatarImage src={char?.avatarUrl} />
                                        <AvatarFallback className={`text-xs font-bold ${isCurrent ? 'bg-accent text-black' : 'bg-slate-800 text-slate-400'}`}>
                                            {entry.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Initiative Value Badge */}
                                    <div className={`
                                        h-8 w-8 rounded flex items-center justify-center font-bold text-sm border shrink-0
                                        ${isCurrent
                                            ? 'bg-accent text-black border-accent shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                                            : 'bg-slate-800 text-slate-400 border-white/10'}
                                    `}>
                                        {entry.value}
                                    </div>

                                    {/* Character Info */}
                                    <div className="flex-1 overflow-hidden min-w-0">
                                        <p className={`font-bold text-sm truncate ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                                            {entry.name}
                                        </p>
                                        
                                        {/* HP Bar for Characters */}
                                        {char && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <Heart className={`w-3 h-3 ${isCurrent ? 'text-red-400' : 'text-red-600/50'}`} />
                                                <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${
                                                            (char.hp / char.maxHp) > 0.5 ? 'bg-green-500' :
                                                            (char.hp / char.maxHp) > 0.25 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100))}%` }}
                                                    />
                                                </div>
                                                <span className="text-[9px] text-slate-500 font-mono w-12 text-right">
                                                    {char.hp}/{char.maxHp}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* NPC Badge */}
                                        {entry.isNpc && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Skull className="w-3 h-3 text-red-400" />
                                                <span className="text-[9px] text-red-400 uppercase tracking-wider font-bold">Inimigo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Remove Button (Master Only) */}
                                    {isMaster && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                                                    onClick={() => onRemove(entry.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Remover da iniciativa</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-xs italic">
                            <Dices className="w-8 h-8 opacity-20 mx-auto mb-2" />
                            <p>Combate não iniciado</p>
                            <p className="text-[10px] mt-1 opacity-50">Adicione personagens para começar</p>
                        </div>
                    )}
                </div>

                {/* Current Turn Indicator */}
                {campaign?.initiativeList?.length > 0 && (
                    <div className="shrink-0 bg-black/30 p-2 rounded border border-accent/20 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Turno Atual</p>
                        <p className="text-sm font-bold text-accent">
                            {campaign.initiativeList[campaign.currentTurnIndex || 0]?.name || "Aguardando..."}
                        </p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
