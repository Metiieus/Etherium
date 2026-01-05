import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
    Mic, MicOff, Video, VideoOff, MessageSquare, Send,
    Dices, Settings, Shield, Sword, Map as MapIcon,
    ChevronRight, Users, Crown, Upload, Plus, Gift, Zap, LogOut,
    Trash2, ArrowDownUp, RefreshCw, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebRTC } from "@/_core/hooks/useWebRTC";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, arrayUnion, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useGameStore } from "@/store/gameStore";
import { ChatPanel } from "@/components/game-session/ChatPanel";
import { InitiativePanel } from "@/components/game-session/InitiativePanel";
import { DicePanel } from "@/components/game-session/DicePanel";
import { ToolsMenu } from "@/components/game-session/ToolsMenu";

export default function GameSession() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();

    // Store State
    const {
        activeTool, setActiveTool,
        inspectorView, setInspectorView,
        campaign, setCampaign,
        characters, setCharacters
    } = useGameStore();

    // UI States (Local)
    const [msgInput, setMsgInput] = useState("");
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [mapImage, setMapImage] = useState("https://images.unsplash.com/photo-1620644780185-3f6929c3fa9c?q=80&w=2670&auto=format&fit=crop");
    const videoRef = useRef<HTMLVideoElement>(null);

    // Data States (Local - specific to actions)
    const [xpAmount, setXpAmount] = useState(100);
    const [itemName, setItemName] = useState("");
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [itemImage, setItemImage] = useState("");
    const [itemFile, setItemFile] = useState<File | null>(null);

    // Inspector State (Local)
    const [inspectorCharId, setInspectorCharId] = useState<string | null>(null);
    const [damageInput, setDamageInput] = useState(0);
    const [conditionInput, setConditionInput] = useState("Cegueira");
    const [showGiveItem, setShowGiveItem] = useState(false);
    const [abilityPointsInput, setAbilityPointsInput] = useState(0);

    // Initiative State (Local)
    const [newInitName, setNewInitName] = useState("");
    const [newInitValue, setNewInitValue] = useState(0);

    // WebRTC Logic
    const isMaster = campaign?.masterId === user?.id; // Re-computed later but needed for hook
    const { remoteStream, setLocalStream } = useWebRTC(id, user?.id, isMaster || false);

    // Chat State with Explicit Type
    const [chatMessages, setChatMessages] = useState<{ id: string | number; user: string; text: string; time: string; role: string; }[]>([
        { id: 1, user: "Sistema", text: "Bem-vindo à sessão de jogo!", time: "Agora", role: "system" },
    ]);

    // Computed
    const playerCharacter = characters.find((c: any) => c.userId === user?.id);
    const selectedCharForInspector = characters.find((c: any) => c.id === inspectorCharId);

    // Fetch Campaign & Characters
    useEffect(() => {
        if (!id) return;

        // Fetch Campaign
        // Fetch Campaign (Realtime)
        const unsubCampaign = onSnapshot(doc(db, "campaigns", id), (snap) => {
            if (snap.exists()) setCampaign({ id: snap.id, ...snap.data() });
        });

        // Fetch Characters
        const q = query(collection(db, "characters"), where("campaignId", "==", id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCharacters(chars);
        });
        return () => { unsubscribe(); unsubCampaign(); };
    }, [id]);

    // Presence Logic
    useEffect(() => {
        if (!playerCharacter) return;

        // Mark as Online on entry
        const charRef = doc(db, "characters", playerCharacter.id);
        if (!playerCharacter.isOnline) {
            updateDoc(charRef, { isOnline: true }).catch(console.error);
        }

        // Cleanup: Mark as Offline on simple unmount
        return () => {
            // We use a beacon or simple update if possible, but for SPA navigation:
            updateDoc(charRef, { isOnline: false }).catch(console.error);
        };
    }, [playerCharacter?.id]);

    // Handle explicit exit
    const handleExit = async () => {
        if (playerCharacter) {
            await updateDoc(doc(db, "characters", playerCharacter.id), { isOnline: false });
        }
        window.location.href = "/campaigns"; // Hard navigation to ensure clean state or useLocation
    };

    // Message & Journal Subscriptions
    const [journalEntries, setJournalEntries] = useState<any[]>([]);

    useEffect(() => {
        if (!id) return;

        // Chat Subscription
        const qChat = query(collection(db, "campaigns", id, "chat"), orderBy("createdAt", "asc")); // Ensure index exists or use client sort if small
        const unsubChat = onSnapshot(qChat, (snapshot) => {
            setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        });

        // Journal Subscription
        const qJournal = query(collection(db, "campaigns", id, "journal"), orderBy("createdAt", "desc"));
        const unsubJournal = onSnapshot(qJournal, (snapshot) => {
            setJournalEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubChat(); unsubJournal(); };
    }, [id]);

    // Helper to Log System Actions
    const logSystemAction = async (text: string, type: 'system' | 'master' | 'red' | 'green' = 'master') => {
        if (!id) return;
        try {
            await addDoc(collection(db, "campaigns", id, "chat"), {
                user: "O Mestre",
                text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                role: type,
                createdAt: serverTimestamp()
            });
        } catch (error) { console.error("Error logging action:", error); }
    };

    // Media Stream Setup (Corrected for Players too)
    useEffect(() => {
        let stream: MediaStream | null = null;

        const startVideo = async () => {
            if (isCamOn) { // Removed isMaster check to allow players to see themselves
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    if (isMaster) setLocalStream(stream); // Broadcast stream
                } catch (err: any) {
                    console.warn("Failed to get video+audio, trying video only...", err);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                        }
                        toast({ title: "Microfone indisponível", description: "Iniciando com vídeo.", variant: "default" });
                    } catch (err2: any) {
                        console.error("Webcam error:", err2);
                        toast({ title: "Erro na Webcam", description: "Não foi possível acessar a câmera.", variant: "destructive" });
                        setIsCamOn(false);
                    }
                }
            } else {
                if (videoRef.current && videoRef.current.srcObject) {
                    const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                    tracks.forEach(track => track.stop());
                    videoRef.current.srcObject = null;
                }
            }
        };

        // Small timeout to ensure ref is mounted when switching views
        setTimeout(startVideo, 100);

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCamOn, playerCharacter]); // Removed isMaster dependency to fix player cam

    const handleSendMessage = async () => {
        if (!msgInput.trim() || !id) return;
        try {
            await addDoc(collection(db, "campaigns", id, "chat"), {
                user: user?.name || "Jogador",
                text: msgInput,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                role: isMaster ? 'master' : 'player',
                createdAt: serverTimestamp()
            });
            setMsgInput("");
        } catch (error) { console.error("Error sending message:", error); }
    };

    // New State for Journal Input since it was missing or impromptu
    const [journalInput, setJournalInput] = useState("");

    const handleAddJournal = async () => {
        if (!journalInput.trim() || !id) return;
        try {
            await addDoc(collection(db, "campaigns", id, "journal"), {
                text: journalInput,
                author: user?.name || "Mestre",
                createdAt: serverTimestamp(), // Use serverTimestamp for sorting
                displayDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // Display string
            });
            setJournalInput("");
            toast({ title: "Diário Atualizado" });
        } catch (error) { console.error("Error adding journal:", error); }
    };

    const rollDice = (sides: number) => {
        const result = Math.floor(Math.random() * sides) + 1;
        logSystemAction(`${user?.name} rolou um d${sides}:🎲 ${result}`, 'system');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMapImage(reader.result as string);
                toast({ title: "Mapa Atualizado", description: "Imagem carregada do computador." });
            };
            reader.readAsDataURL(file);
        }
    };

    const giveXp = async (charId: string, amount: number) => {
        try {
            const charRef = doc(db, "characters", charId);
            const charSnap = await getDoc(charRef);
            if (charSnap.exists()) {
                const currentXp = charSnap.data().xp || 0;
                await updateDoc(charRef, { xp: currentXp + amount });
                toast({ title: "XP Concedido!", description: `${amount} XP adicionado.` });
                logSystemAction(`Concedeu ${amount} XP para ${charSnap.data().name}`, 'master');
            }
        } catch (error) { console.error(error); }
    };

    const handleItemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setItemImage(reader.result as string);
                setItemFile(file); // Store file for upload
                toast({ title: "Carta Carregada", description: "Imagem do item pronta para enviar." });
            };
            reader.readAsDataURL(file);
        }
    };

    const giveItem = async (charId: string, item: string, img: string) => {
        if (!item || !img) {
            toast({ title: "Erro", description: "Nome e Imagem são obrigatórios para cartas.", variant: "destructive" });
            return;
        }
        try {
            let finalImageUrl = img;

            // Upload to Storage if a file was selected
            if (itemFile) {
                const storageRef = ref(storage, `campaign_uploads/${id}/items/${Date.now()}_${itemFile.name}`);
                const snapshot = await uploadBytes(storageRef, itemFile);
                finalImageUrl = await getDownloadURL(snapshot.ref);
            }

            const charRef = doc(db, "characters", charId);
            await updateDoc(charRef, {
                inventory: arrayUnion({ name: item, type: "card", imageUrl: finalImageUrl, addedAt: new Date().toISOString() })
            });
            toast({ title: "Carta Enviada!", description: `${item} adicionado ao inventário.` });
            const char = characters.find((c: any) => c.id === charId);
            logSystemAction(`Concedeu o item ${item} para ${characters.find((c: any) => c.id === charId)?.name}.`, 'master');
            setItemName("");
            setItemImage("");
            setItemFile(null);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao enviar item", description: String(error), variant: "destructive" });
        }
    };

    const updateAbilityPoints = async (charId: string, value: number) => {
        try {
            const charRef = doc(db, "characters", charId);
            const char = characters.find((c: any) => c.id === charId);
            if (!char) return;
            const current = char.abilityPoints || 0;
            const max = char.maxAbilityPoints || 10;
            const newValue = Math.min(max, Math.max(0, current + value));

            await updateDoc(charRef, { abilityPoints: newValue });
            toast({ title: "Pontos de Habilidade Atualizados" });

            if (value !== 0) {
                logSystemAction(`${value > 0 ? 'Restaurou' : 'Drenou'} ${Math.abs(value)} ponto(s) de habilidade de ${char.name}.`, 'master');
            }

            setAbilityPointsInput(0);
        } catch (error) { console.error(error); }
    };

    const applyDamage = async (charId: string, amount: number, type: 'damage' | 'heal') => {
        try {
            const charRef = doc(db, "characters", charId);
            const char = characters.find((c: any) => c.id === charId);
            if (!char) return;

            const currentHp = char.hp || 0;
            const maxHp = char.maxHp || 100; // Default max if not set
            let newHp = currentHp;

            if (type === 'damage') {
                newHp = Math.max(0, currentHp - amount);
                logSystemAction(`Causou ${amount} de dano a ${char.name}. (HP: ${newHp}/${maxHp})`, 'master');
            } else {
                newHp = Math.min(maxHp, currentHp + amount);
                logSystemAction(`Curou ${amount} de vida de ${char.name}. (HP: ${newHp}/${maxHp})`, 'master');
            }

            await updateDoc(charRef, { hp: newHp });
            toast({ title: type === 'damage' ? "Dano Aplicado" : "Cura Aplicada" });
            setDamageInput(0);
        } catch (error) { console.error(error); }
    };

    const toggleCondition = async (charId: string, condition: string) => {
        try {
            const charRef = doc(db, "characters", charId);
            const char = characters.find((c: any) => c.id === charId);
            if (!char) return;

            const currentConditions = char.conditions || [];
            let newConditions;

            if (currentConditions.includes(condition)) {
                newConditions = currentConditions.filter((c: string) => c !== condition);
                toast({ title: "Condição Removida", description: condition });
                logSystemAction(`Removeu a condição '${condition}' de ${char.name}.`, 'master');
            } else {
                newConditions = [...currentConditions, condition];
                toast({ title: "Condição Aplicada", description: condition });
                logSystemAction(`Aplicou a condição '${condition}' em ${char.name}.`, 'master');
            }

            await updateDoc(charRef, { conditions: newConditions });
        } catch (error) { console.error(error); }
    };

    // --- INITIATIVE TRACKER LOGIC ---

    const addToInitiative = async (name: string, value: number, isNpc = true) => {
        if (!campaign) return;
        const currentList = campaign.initiativeList || [];
        const newItem = { id: Date.now().toString(), name, value, isNpc };
        const newList = [...currentList, newItem].sort((a: any, b: any) => b.value - a.value);

        await updateDoc(doc(db, "campaigns", campaign.id), {
            initiativeList: newList
        });
        setNewInitName("");
        setNewInitValue(0);
    };

    const removeFromInitiative = async (itemId: string) => {
        if (!campaign) return;
        const currentList = campaign.initiativeList || [];
        const newList = currentList.filter((i: any) => i.id !== itemId);
        await updateDoc(doc(db, "campaigns", campaign.id), {
            initiativeList: newList
        });
    };

    const nextTurn = async () => {
        if (!campaign || !campaign.initiativeList || campaign.initiativeList.length === 0) return;
        const currentIdx = campaign.currentTurnIndex ?? -1;
        let nextIdx = currentIdx + 1;
        let round = campaign.round ?? 1;

        if (nextIdx >= campaign.initiativeList.length) {
            nextIdx = 0;
            round += 1;
            logSystemAction(`🟢 Nova Rodada Iniciada: Rodada ${round}`, 'system');
        }

        await updateDoc(doc(db, "campaigns", campaign.id), {
            currentTurnIndex: nextIdx,
            round: round
        });

        // Notify who's turn it is
        const currentEntity = campaign.initiativeList[nextIdx];
        if (currentEntity) {
            toast({ title: "Turno de", description: currentEntity.name });
        }
    };

    const sortInitiative = async () => {
        if (!campaign || !campaign.initiativeList) return;
        const sorted = [...campaign.initiativeList].sort((a: any, b: any) => b.value - a.value);
        await updateDoc(doc(db, "campaigns", campaign.id), {
            initiativeList: sorted,
            currentTurnIndex: 0
        });
    };

    const resetInitiative = async () => {
        if (!confirm("Limpar toda a iniciativa?")) return;
        await updateDoc(doc(db, "campaigns", campaign.id), {
            initiativeList: [],
            currentTurnIndex: 0,
            round: 1
        });
    };

    return (
        <div className="h-screen w-screen bg-black text-foreground font-sans overflow-hidden flex flex-col relative select-none">
            {/* Background Map/Scene */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/60 z-10 pointer-events-none" />
                <img src={mapImage} alt="Map" className="w-full h-full object-cover opacity-50" />
            </div>

            {/* Main Content Overlay */}
            <div className="relative z-10 h-full flex flex-col">
                {/* 1. Top Bar (Header) */}
                <header className="h-14 bg-black/80 border-b border-accent/20 flex items-center justify-between px-4 shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Link href="/campaigns" className="text-accent/80 hover:text-accent transition-colors"><ChevronRight className="w-5 h-5 rotate-180" /></Link>
                        <div>
                            <h1 className="text-sm font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                                <Crown className="w-4 h-4" /> {campaign?.name || "Carregando..."}
                            </h1>
                            <p className="text-[10px] text-muted-foreground font-mono">SESSÃO: {id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Dialog open={showGiveItem} onOpenChange={setShowGiveItem}>
                            <DialogTrigger asChild><Button variant="outline" size="sm" className="hidden">Open</Button></DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-accent/20 sm:max-w-md">
                                <DialogHeader><DialogTitle className="text-accent font-cinzel">Conceder Item (Carta)</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Nome do Item</Label>
                                        <Input value={itemName} onChange={(e) => setItemName(e.target.value)} className="bg-black/50 border-white/10" placeholder="Ex: Espada Longa" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Imagem da Carta</Label>
                                        <div className="flex items-center gap-2">
                                            <Input type="file" onChange={handleItemUpload} className="hidden" id="item-upload" accept="image/*" />
                                            <Button variant="secondary" onClick={() => document.getElementById('item-upload')?.click()} className="w-full"><Upload className="w-4 h-4 mr-2" /> Escolher Imagem</Button>
                                        </div>
                                        {itemImage && <div className="mt-2 aspect-[2/3] w-32 mx-auto rounded overflow-hidden border border-accent/30"><img src={itemImage} className="w-full h-full object-cover" /></div>}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={() => selectedCharId && giveItem(selectedCharId, itemName, itemImage)} className="bg-accent text-black hover:bg-yellow-500 w-full font-bold">Enviar Carta 🃏</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" className="h-8 text-xs font-bold" onClick={handleExit}><LogOut className="w-3 h-3 mr-2" /> SAIR DA MESA</Button>
                    </div>
                </header>

                {/* 2. Game Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Chat & Journal */}
                    <div className="p-2 flex flex-col gap-2">
                        <ChatPanel messages={chatMessages} onSend={(text) => { setMsgInput(text); handleSendMessage(); }} />
                    </div>

                    {/* Center: Canvas/Map - Placeholder for now, keeping simple div */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Round Counter Overlay */}
                        {(campaign?.initiativeList?.length || 0) > 0 && (campaign?.round || 1) > 1 && (
                            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-accent px-6 py-2 rounded-full border border-accent/30 shadow-[0_0_20px_rgba(234,179,8,0.2)] backdrop-blur text-xl font-cinzel font-bold animate-in fade-in slide-in-from-top-4 z-50 pointer-events-none">
                                ROUND {campaign.round}
                            </div>
                        )}
                        <div className="h-[350px] flex gap-2 p-2 pt-0 w-full mt-auto mb-10">
                            {/* Tools Container */}
                            <Card className="flex-1 bg-slate-950/90 border-accent/20 backdrop-blur-md flex flex-col p-3 overflow-hidden shadow-2xl relative">
                                {activeTool ? (
                                    <div className="h-full flex flex-col animate-in slide-in-from-right-10 duration-300 min-h-0">
                                        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 shrink-0">
                                            <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                                                {activeTool === 'initiative' ? <><Sword className="w-4 h-4" /> Iniciativa</> :
                                                    activeTool === 'dice' ? <><Dices className="w-4 h-4" /> Rolador</> :
                                                        activeTool === 'chat' ? <><MessageSquare className="w-4 h-4" /> Chat</> :
                                                            activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}
                                            </h3>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500" onClick={() => setActiveTool(null)}>
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* RENDER ACTIVE TOOL COMPONENT */}
                                        {activeTool === 'initiative' && (
                                            <InitiativePanel
                                                campaign={campaign}
                                                isMaster={isMaster || false}
                                                onAdd={addToInitiative}
                                                onRemove={removeFromInitiative}
                                                onNext={nextTurn}
                                                onSort={sortInitiative}
                                                onReset={resetInitiative}
                                            />
                                        )}
                                        {activeTool === 'dice' && (
                                            <DicePanel
                                                chatMessages={chatMessages}
                                                onRoll={rollDice}
                                            />
                                        )}
                                        {/* Fallback or other tools */}
                                    </div>
                                ) : (
                                    <ToolsMenu isMaster={isMaster || false} activeTool={activeTool} onSelectTool={setActiveTool} />
                                )}
                            </Card>
                        </div>
                    </div>

                    {/* Right Sidebar: Player Webcams */}
                    <div className="w-64 bg-slate-950 border-l border-accent/20 flex flex-col p-2 gap-2 overflow-y-auto custom-scrollbar">
                        <div className="pb-2 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Jogadores ({characters.length})</span>
                        </div>
                        {characters.map((char: any) => (
                            <div key={char.id} className="aspect-video bg-zinc-900 rounded border border-white/5 relative group overflow-hidden shrink-0">
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                                    <Avatar><AvatarImage src={char.avatarUrl} /><AvatarFallback className="text-black font-bold">{char.name[0]}</AvatarFallback></Avatar>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60"><p className="text-xs text-white">{char.name}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
