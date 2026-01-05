import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";

interface ChatPanelProps {
    messages: any[];
    onSend: (text: string) => void;
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
    const [msgInput, setMsgInput] = useState("");

    const handleSend = () => {
        if (!msgInput.trim()) return;
        onSend(msgInput);
        setMsgInput("");
    };

    return (
        <Card className="w-[300px] bg-slate-950/80 border-accent/20 flex flex-col overflow-hidden backdrop-blur-sm shrink-0">
            <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Chat do Grupo
                </span>
            </div>
            <ScrollArea className="flex-1 p-3 space-y-3">
                {messages.map(msg => (
                    <div key={msg.id} className={`mb-2 text-sm ${msg.role === 'master' ? 'text-yellow-500' : msg.role === 'red' ? 'text-red-500' : msg.role === 'green' ? 'text-green-500' : msg.role === 'system' ? 'text-blue-400 font-bold italic' : 'text-slate-300'}`}>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold opacity-70">{msg.user}</span>
                            <span className="text-[10px] opacity-30">{msg.time}</span>
                        </div>
                        <p className="font-lora leading-tight">{msg.text}</p>
                    </div>
                ))}
            </ScrollArea>
            <div className="p-2 bg-black/20 border-t border-white/5 flex gap-2">
                <Input
                    className="h-8 bg-transparent border-white/10 text-xs focus-visible:ring-accent"
                    placeholder="Mensagem..."
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    autoComplete="off"
                />
                <Button size="icon" onClick={handleSend} className="h-8 w-8 bg-accent text-black hover:bg-yellow-500">
                    <Send className="w-3 h-3" />
                </Button>
            </div>
        </Card>
    );
}
