import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dices, Trash2, ArrowDownUp, Play, Plus } from "lucide-react";
import { useState } from "react";

interface InitiativePanelProps {
    campaign: any;
    isMaster: boolean;
    onAdd: (name: string, value: number) => void;
    onRemove: (id: string) => void;
    onNext: () => void;
    onSort: () => void;
    onReset: () => void;
}

export function InitiativePanel({ campaign, isMaster, onAdd, onRemove, onNext, onSort, onReset }: InitiativePanelProps) {
    const [newInitName, setNewInitName] = useState("");
    const [newInitValue, setNewInitValue] = useState(0);

    return (
        <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
            {/* Toolbar for Master */}
            {isMaster && (
                <div className="flex flex-col gap-2 shrink-0 bg-black/30 p-2 rounded border border-white/5">
                    <div className="flex gap-2">
                        <Input
                            className="h-7 text-xs flex-1"
                            placeholder="Nome (Monstro/NPC)"
                            value={newInitName}
                            onChange={e => setNewInitName(e.target.value)}
                        />
                        <Input
                            type="number"
                            className="h-7 text-xs w-16"
                            placeholder="Val"
                            value={newInitValue}
                            onChange={e => setNewInitValue(Number(e.target.value))}
                        />
                        <Button size="sm" variant="secondary" className="h-7 w-7 p-0" onClick={() => { onAdd(newInitName, newInitValue); setNewInitName(""); setNewInitValue(0); }}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2 justify-between mt-1">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={onReset}>
                            <Trash2 className="w-3 h-3 mr-1" /> Limpar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground hover:text-white" onClick={onSort}>
                            <ArrowDownUp className="w-3 h-3 mr-1" /> Ordenar
                        </Button>
                        <Button size="sm" className="h-7 bg-accent text-black font-bold text-xs" onClick={onNext}>
                            <Play className="w-3 h-3 mr-1" /> Próximo
                        </Button>
                    </div>
                </div>
            )}

            {/* Initiative List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-2">
                {campaign?.initiativeList?.length > 0 ? (
                    campaign.initiativeList.map((entry: any, index: number) => (
                        <div
                            key={entry.id}
                            className={`
                            flex items-center gap-3 p-2 rounded border transition-all duration-300
                            ${index === (campaign.currentTurnIndex || 0)
                                    ? 'bg-accent/20 border-accent/50 scale-[1.02] shadow-[0_0_15px_rgba(251,191,36,0.1)]'
                                    : 'bg-black/20 border-white/5 opacity-80'}
                        `}
                        >
                            <div className={`
                            h-8 w-8 rounded flex items-center justify-center font-bold text-sm border
                            ${index === (campaign.currentTurnIndex || 0)
                                    ? 'bg-accent text-black border-accent'
                                    : 'bg-slate-800 text-slate-400 border-white/10'}
                        `}>
                                {entry.value}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className={`font-bold text-sm truncate ${index === (campaign.currentTurnIndex || 0) ? 'text-white' : 'text-slate-400'}`}>
                                    {entry.name}
                                </p>
                                {entry.isNpc && isMaster && <span className="text-[9px] text-red-400 uppercase tracking-wider">Inimigo</span>}
                            </div>
                            {isMaster && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    onClick={() => onRemove(entry.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                        <Dices className="w-8 h-8 opacity-20 mx-auto mb-2" />
                        Combate não iniciado
                    </div>
                )}
            </div>
        </div>
    );
}
