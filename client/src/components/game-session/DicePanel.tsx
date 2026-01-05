import { Button } from "@/components/ui/button";
import { Dices } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth"; // Might need to pass user or use hook
// import { useGameStore } from "@/store/gameStore"; // If using store for messages

interface DicePanelProps {
    chatMessages: any[];
    onRoll: (sides: number) => void;
}

export function DicePanel({ chatMessages, onRoll }: DicePanelProps) {
    return (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-4 gap-2 shrink-0">
                {[4, 6, 8, 10, 12, 20, 100].map(die => (
                    <Button key={die} onClick={() => onRoll(die)} variant="outline" className="h-10 border-accent/20 hover:bg-accent hover:text-black font-cinzel text-xs p-0 transition-all hover:scale-105">
                        d{die}
                    </Button>
                ))}
            </div>
            <div className="flex-1 bg-black/30 rounded border border-white/5 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Dices className="w-3 h-3" /> Histórico
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {chatMessages.filter(m => m.text.includes('🎲')).slice().reverse().map(msg => (
                        <div key={msg.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-white/5 border border-white/5">
                            <span className="font-bold text-slate-300 truncate w-24">{msg.user}</span>
                            <span className="text-accent font-cinzel font-bold">{msg.text.split('🎲')[1]}</span>
                            <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                        </div>
                    ))}
                    {chatMessages.filter(m => m.text.includes('🎲')).length === 0 && (
                        <p className="text-[10px] text-muted-foreground text-center italic py-4">Nenhuma rolagem ainda.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
