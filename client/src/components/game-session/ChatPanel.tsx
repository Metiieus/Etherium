import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageSquare, Send, Dices } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface ChatPanelProps {
    messages: any[];
    onSend: (text: string) => void;
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
    const [msgInput, setMsgInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!msgInput.trim()) return;
        onSend(msgInput);
        setMsgInput("");
    };

    // Detect dice roll command (e.g., /roll 1d20+5)
    const handleDiceCommand = (text: string) => {
        const diceRegex = /\/roll\s+(\d+)d(\d+)([+-]\d+)?/i;
        const match = text.match(diceRegex);
        
        if (match) {
            const [, count, sides, modifier] = match;
            const rolls = Array.from({ length: parseInt(count) }, () => 
                Math.floor(Math.random() * parseInt(sides)) + 1
            );
            const sum = rolls.reduce((a, b) => a + b, 0);
            const mod = modifier ? parseInt(modifier) : 0;
            const total = sum + mod;
            
            const resultText = `🎲 Rolou ${count}d${sides}${modifier || ''}: [${rolls.join(', ')}] ${modifier ? `${mod >= 0 ? '+' : ''}${mod}` : ''} = **${total}**`;
            onSend(resultText);
            setMsgInput("");
            return true;
        }
        return false;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (msgInput.startsWith('/roll')) {
                handleDiceCommand(msgInput);
            } else {
                handleSend();
            }
        }
    };

    // Format message text (simple markdown-like)
    const formatMessage = (text: string) => {
        // Bold: **text**
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
        // Italic: *text*
        formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
        // Dice emoji
        formatted = formatted.replace(/🎲/g, '<span class="inline-block animate-pulse">🎲</span>');
        return formatted;
    };

    return (
        <Card className="w-full h-full bg-slate-950/90 border-accent/20 flex flex-col overflow-hidden backdrop-blur-sm shadow-2xl">
            {/* Header */}
            <div className="p-3 border-b border-white/10 bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Chat do Grupo
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                    {messages.length} mensagens
                </span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                    {messages.map((msg, index) => {
                        const isSystem = msg.role === 'system';
                        const isMaster = msg.role === 'master';
                        const isDiceRoll = msg.text.includes('🎲');
                        
                        return (
                            <div 
                                key={msg.id || index} 
                                className={`
                                    animate-in slide-in-from-bottom-2 fade-in duration-300
                                    ${isSystem ? 'bg-blue-500/10 border-l-2 border-blue-500 pl-2 py-1 rounded-r' : ''}
                                    ${isDiceRoll ? 'bg-accent/10 border-l-2 border-accent pl-2 py-1 rounded-r' : ''}
                                `}
                            >
                                {/* Message Header */}
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className={`
                                        text-xs font-bold
                                        ${isMaster ? 'text-yellow-500' : 
                                          msg.role === 'red' ? 'text-red-500' : 
                                          msg.role === 'green' ? 'text-green-500' : 
                                          isSystem ? 'text-blue-400' : 
                                          'text-slate-300'}
                                    `}>
                                        {msg.user}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        {msg.time}
                                    </span>
                                    {isDiceRoll && <Dices className="w-3 h-3 text-accent animate-pulse" />}
                                </div>

                                {/* Message Text */}
                                <p 
                                    className={`
                                        text-sm leading-relaxed font-lora
                                        ${isSystem ? 'font-bold italic text-blue-300' : 
                                          isMaster ? 'text-slate-200' : 
                                          'text-slate-300'}
                                    `}
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                                />
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 bg-black/30 border-t border-white/10 shrink-0">
                <div className="flex gap-2">
                    <Input
                        className="h-9 bg-black/50 border-white/10 text-sm focus-visible:ring-accent placeholder:text-muted-foreground/50"
                        placeholder="Mensagem ou /roll 1d20+5..."
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                    />
                    <Button 
                        size="icon" 
                        onClick={handleSend} 
                        className="h-9 w-9 bg-accent text-black hover:bg-yellow-500 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Use <code className="bg-white/5 px-1 rounded">/roll 1d20+5</code> para rolar dados
                </p>
            </div>
        </Card>
    );
}
