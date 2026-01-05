import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dices, TrendingUp, Target, Zap } from "lucide-react";
import { useState, useMemo } from "react";

interface DicePanelProps {
    chatMessages: any[];
    onRoll: (sides: number) => void;
}

export function DicePanel({ chatMessages, onRoll }: DicePanelProps) {
    const [lastRoll, setLastRoll] = useState<{ sides: number; result: number } | null>(null);
    const [isRolling, setIsRolling] = useState(false);

    // Filter dice roll messages
    const diceRolls = useMemo(() => {
        return chatMessages
            .filter(m => m.text.includes('🎲'))
            .map(m => {
                const match = m.text.match(/d(\d+).*?(\d+)$/);
                return {
                    ...m,
                    sides: match ? parseInt(match[1]) : 20,
                    result: match ? parseInt(match[2]) : 0
                };
            });
    }, [chatMessages]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (diceRolls.length === 0) return { avg: 0, max: 0, crits: 0 };
        
        const results = diceRolls.map(r => r.result);
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        const max = Math.max(...results);
        const crits = diceRolls.filter(r => r.result === 20 || r.result === r.sides).length;
        
        return { avg: avg.toFixed(1), max, crits };
    }, [diceRolls]);

    const handleRoll = (sides: number) => {
        setIsRolling(true);
        const result = Math.floor(Math.random() * sides) + 1;
        setLastRoll({ sides, result });
        
        setTimeout(() => {
            onRoll(sides);
            setIsRolling(false);
        }, 500);
    };

    const diceTypes = [
        { sides: 4, color: 'from-blue-500 to-blue-700', label: 'd4' },
        { sides: 6, color: 'from-green-500 to-green-700', label: 'd6' },
        { sides: 8, color: 'from-yellow-500 to-yellow-700', label: 'd8' },
        { sides: 10, color: 'from-orange-500 to-orange-700', label: 'd10' },
        { sides: 12, color: 'from-red-500 to-red-700', label: 'd12' },
        { sides: 20, color: 'from-purple-500 to-purple-700', label: 'd20' },
        { sides: 100, color: 'from-pink-500 to-pink-700', label: 'd100' },
    ];

    return (
        <TooltipProvider>
            <div className="flex-1 flex flex-col gap-3 min-h-0">
                {/* Dice Buttons */}
                <div className="grid grid-cols-4 gap-2 shrink-0">
                    {diceTypes.map(die => (
                        <Tooltip key={die.sides}>
                            <TooltipTrigger asChild>
                                <Button 
                                    onClick={() => handleRoll(die.sides)} 
                                    variant="outline" 
                                    className={`
                                        h-12 border-accent/20 hover:bg-accent hover:text-black font-cinzel text-sm p-0 
                                        transition-all hover:scale-110 active:scale-95 relative overflow-hidden group
                                        ${isRolling && lastRoll?.sides === die.sides ? 'animate-bounce' : ''}
                                    `}
                                    disabled={isRolling}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${die.color} opacity-0 group-hover:opacity-20 transition-opacity`} />
                                    <span className="relative z-10 flex items-center gap-1">
                                        <Dices className="w-4 h-4" />
                                        {die.label}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Rolar {die.label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>

                {/* Last Roll Display */}
                {lastRoll && (
                    <div className="shrink-0 bg-gradient-to-r from-accent/20 to-transparent border border-accent/30 rounded-lg p-3 animate-in slide-in-from-top-4 fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Dices className="w-5 h-5 text-accent animate-spin" style={{ animationDuration: '2s' }} />
                                <span className="text-xs text-muted-foreground">Última rolagem:</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-accent font-cinzel">d{lastRoll.sides}</span>
                                <Badge className="bg-accent text-black font-bold text-lg px-3 shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                                    {lastRoll.result}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* Statistics */}
                {diceRolls.length > 0 && (
                    <div className="shrink-0 grid grid-cols-3 gap-2">
                        <div className="bg-black/30 rounded border border-white/5 p-2 text-center">
                            <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Média</p>
                            <p className="text-lg font-bold text-blue-400">{stats.avg}</p>
                        </div>
                        <div className="bg-black/30 rounded border border-white/5 p-2 text-center">
                            <Target className="w-4 h-4 text-green-400 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Máximo</p>
                            <p className="text-lg font-bold text-green-400">{stats.max}</p>
                        </div>
                        <div className="bg-black/30 rounded border border-white/5 p-2 text-center">
                            <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">Críticos</p>
                            <p className="text-lg font-bold text-yellow-400">{stats.crits}</p>
                        </div>
                    </div>
                )}

                {/* History */}
                <div className="flex-1 bg-black/30 rounded border border-white/5 overflow-hidden flex flex-col min-h-0">
                    <div className="p-2 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Dices className="w-3 h-3" /> Histórico
                        </div>
                        <Badge variant="outline" className="text-[9px] h-4">
                            {diceRolls.length} rolagens
                        </Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {diceRolls.slice().reverse().map((roll, index) => {
                            const isCrit = roll.result === 20 || roll.result === roll.sides;
                            const isFail = roll.result === 1;
                            
                            return (
                                <div 
                                    key={roll.id || index} 
                                    className={`
                                        flex justify-between items-center text-xs p-2 rounded transition-all
                                        ${isCrit ? 'bg-green-500/20 border border-green-500/30' : 
                                          isFail ? 'bg-red-500/20 border border-red-500/30' : 
                                          'bg-white/5 border border-white/5'}
                                        hover:bg-white/10
                                    `}
                                >
                                    <span className="font-bold text-slate-300 truncate w-20">{roll.user}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground font-mono">d{roll.sides}</span>
                                        <Badge 
                                            variant="outline" 
                                            className={`
                                                font-cinzel font-bold
                                                ${isCrit ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                                                  isFail ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                                  'bg-accent/20 text-accent border-accent/30'}
                                            `}
                                        >
                                            {roll.result}
                                        </Badge>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-mono">{roll.time}</span>
                                </div>
                            );
                        })}
                        {diceRolls.length === 0 && (
                            <div className="text-center py-8">
                                <Dices className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                                <p className="text-[10px] text-muted-foreground italic">Nenhuma rolagem ainda.</p>
                                <p className="text-[9px] text-muted-foreground/50 mt-1">Clique em um dado para começar!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
