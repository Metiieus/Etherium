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
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, arrayUnion, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useGameStore } from "@/store/gameStore";
import { ChatPanel } from "@/components/game-session/ChatPanel";
import { InitiativePanel } from "@/components/game-session/InitiativePanel";
import { DicePanel } from "@/components/game-session/DicePanel";
import { ToolsMenu } from "@/components/game-session/ToolsMenu";
import { GameScene } from "@/components/game-session/GameScene";

export default function GameSession() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();

    // Store State & Actions
    const {
        activeTool, setActiveTool,
        inspectorView, setInspectorView,
        campaign, setCampaign,
        characters, setCharacters,
        chatMessages, setChatMessages,
        journalEntries, setJournalEntries,
        sendMessage, addJournalEntry, updateCharacter, updateCampaignData,
        addToInitiative, removeFromInitiative, nextTurn, sortInitiative, resetInitiative
    } = useGameStore();

    // UI States (Local)
    const [msgInput, setMsgInput] = useState("");
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [mapImage, setMapImage] = useState("https://images.unsplash.com/photo-1620644780185-3f6929c3fa9c?q=80&w=2670&auto=format&fit=crop");
    const videoRef = useRef<HTMLVideoElement>(null);

    // Data States (Local - specific to actions)
    const [itemName, setItemName] = useState("");
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [itemImage, setItemImage] = useState("");
    const [itemFile, setItemFile] = useState<File | null>(null);

    // Inspector State (Local - temporary UI values)
    const [inspectorCharId, setInspectorCharId] = useState<string | null>(null);
    const [damageInput, setDamageInput] = useState(0);
    const [conditionInput, setConditionInput] = useState("Cegueira");
    const [showGiveItem, setShowGiveItem] = useState(false);
    const [abilityPointsInput, setAbilityPointsInput] = useState(0);

    // Initiative State (Local - temporary UI values)
    const [newInitName, setNewInitName] = useState("");
    const [newInitValue, setNewInitValue] = useState(0); // Kept locally for inputs

    // Derived State
    const isMaster = campaign?.masterId === user?.id;
    const playerCharacter = characters.find((c: any) => c.userId === user?.id);
    const selectedCharForInspector = characters.find((c: any) => c.id === inspectorCharId);

    // WebRTC Logic
    const { remoteStream, setLocalStream } = useWebRTC(id, user?.id, isMaster || false);

    // Fetch Campaign & Characters
    useEffect(() => {
        if (!id) return;

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
    }, [id, setCampaign, setCharacters]);

    // Presence Logic
    useEffect(() => {
        if (!playerCharacter) return;
        const charRef = doc(db, "characters", playerCharacter.id);
        if (!playerCharacter.isOnline) {
            updateCharacter(playerCharacter.id, { isOnline: true });
        }
        return () => {
            updateCharacter(playerCharacter.id, { isOnline: false });
        };
    }, [playerCharacter?.id]); // Depend only on ID stability

    // Handle explicit exit
    const handleExit = async () => {
        if (playerCharacter) {
            await updateCharacter(playerCharacter.id, { isOnline: false });
        }
        window.location.href = "/campaigns";
    };

    // Chat Subscription
    useEffect(() => {
        if (!id) return;
        const qChat = query(collection(db, "campaigns", id, "chat"), orderBy("createdAt", "asc"));
        const unsubChat = onSnapshot(qChat, (snapshot) => {
            setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        });
        return () => unsubChat();
    }, [id, setChatMessages]);

    // Journal Subscription
    useEffect(() => {
        if (!id) return;
        const qJournal = query(collection(db, "campaigns", id, "journal"), orderBy("createdAt", "desc"));
        const unsubJournal = onSnapshot(qJournal, (snapshot) => {
            setJournalEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubJournal();
    }, [id, setJournalEntries]);


    // Media Stream Setup
    useEffect(() => {
        let stream: MediaStream | null = null;
        const startVideo = async () => {
            if (isCamOn) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    if (videoRef.current) videoRef.current.srcObject = stream;
                    if (isMaster) setLocalStream(stream); // Broadcast if master
                } catch (err: any) {
                    console.warn("Retrying video only...", err);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                        if (videoRef.current) videoRef.current.srcObject = stream;
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
        setTimeout(startVideo, 100);
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isCamOn, isMaster]); // Add isMaster to deps if it affects broadcasting

    // Handlers
    const handleSendMessageWrapper = async () => {
        if (!id) return;
        await sendMessage(id, msgInput, user, isMaster ? 'master' : 'player');
        setMsgInput("");
    };

    const [journalInput, setJournalInput] = useState("");
    const handleAddJournalWrapper = async () => {
        if (!id) return;
        await addJournalEntry(id, journalInput, user?.name || "Mestre");
        setJournalInput("");
        toast({ title: "Diário Atualizado" });
    };

    const rollDice = (sides: number) => {
        const result = Math.floor(Math.random() * sides) + 1;
        if (id) sendMessage(id, `${user?.name} rolou um d${sides}:🎲 ${result}`, user, 'system');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMapImage(reader.result as string);
                toast({ title: "Mapa Atualizado" });
            };
            reader.readAsDataURL(file);
        }
    };

    const giveXp = async (charId: string, amount: number) => {
        const char = characters.find((c: any) => c.id === charId);
        if (!char) return;
        await updateCharacter(charId, { xp: (char.xp || 0) + amount });
        toast({ title: "XP Concedido!", description: `${amount} XP adicionado.` });
        if (id) sendMessage(id, `Concedeu ${amount} XP para ${char.name}`, user, 'master');
    };

    const handleItemUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setItemImage(reader.result as string);
                setItemFile(file);
                toast({ title: "Carta Carregada" });
            };
            reader.readAsDataURL(file);
        }
    };

    const giveItem = async (charId: string, item: string, img: string) => {
        if (!item || !img) {
            toast({ title: "Erro", description: "Nome e Imagem obrigatórios.", variant: "destructive" });
            return;
        }
        try {
            let finalImageUrl = img;
            if (itemFile && id) {
                const storageRef = ref(storage, `campaign_uploads/${id}/items/${Date.now()}_${itemFile.name}`);
                const snapshot = await uploadBytes(storageRef, itemFile);
                finalImageUrl = await getDownloadURL(snapshot.ref);
            }

            const charRef = doc(db, "characters", charId);
            await updateDoc(charRef, {
                inventory: arrayUnion({ name: item, type: "card", imageUrl: finalImageUrl, addedAt: new Date().toISOString() })
            });

            toast({ title: "Carta Enviada!" });
            const char = characters.find((c: any) => c.id === charId);
            if (id) sendMessage(id, `Concedeu o item ${item} para ${char?.name}.`, user, 'master');
            setItemName(""); setItemImage(""); setItemFile(null);
        } catch (error) { toast({ title: "Erro", description: String(error), variant: "destructive" }); }
    };

    const updateAbilityPointsWrapper = async (charId: string, value: number) => {
        const char = characters.find((c: any) => c.id === charId);
        if (!char) return;
        const current = char.abilityPoints || 0;
        const max = char.maxAbilityPoints || 10;
        const newValue = Math.min(max, Math.max(0, current + value));
        await updateCharacter(charId, { abilityPoints: newValue });
        toast({ title: "Pontos de Habilidade Atualizados" });
        if (value !== 0 && id) {
            sendMessage(id, `${value > 0 ? 'Restaurou' : 'Drenou'} ${Math.abs(value)} ponto(s) de habilidade de ${char.name}.`, user, 'master');
        }
        setAbilityPointsInput(0);
    };

    const applyDamageWrapper = async (charId: string, amount: number, type: 'damage' | 'heal') => {
        const char = characters.find((c: any) => c.id === charId);
        if (!char) return;
        const currentHp = char.hp || 0;
        const maxHp = char.maxHp || 100;
        let newHp = type === 'damage' ? Math.max(0, currentHp - amount) : Math.min(maxHp, currentHp + amount);

        await updateCharacter(charId, { hp: newHp });
        toast({ title: type === 'damage' ? "Dano Aplicado" : "Cura Aplicada" });
        if (id) sendMessage(id, `${type === 'damage' ? 'Causou' : 'Curou'} ${amount} de ${type === 'damage' ? 'dano a' : 'vida de'} ${char.name}. (HP: ${newHp}/${maxHp})`, user, 'master');
        setDamageInput(0);
    };

    const toggleConditionWrapper = async (charId: string, condition: string) => {
        const char = characters.find((c: any) => c.id === charId);
        if (!char) return;
        const currentConditions = char.conditions || [];
        let newConditions;
        let action = "";

        if (currentConditions.includes(condition)) {
            newConditions = currentConditions.filter((c: string) => c !== condition);
            action = `Removeu a condição '${condition}' de`;
        } else {
            newConditions = [...currentConditions, condition];
            action = `Aplicou a condição '${condition}' em`;
        }

        await updateCharacter(charId, { conditions: newConditions });
        toast({ title: "Condições Atualizadas" });
        if (id) sendMessage(id, `${action} ${char.name}.`, user, 'master');
    };

    // Initiative Wrappers
    const addToInitiativeWrapper = async (name: string, value: number) => {
        if (!campaign?.id) return;
        await addToInitiative(campaign.id, campaign.initiativeList, name, value, true);
        setNewInitName(""); setNewInitValue(0);
    };
    const removeFromInitiativeWrapper = (itemId: string) => campaign?.id && removeFromInitiative(campaign.id, campaign.initiativeList, itemId);
    const nextTurnWrapper = () => campaign?.id && nextTurn(campaign.id, campaign.initiativeList, campaign.currentTurnIndex, campaign.round);
    const sortInitiativeWrapper = () => campaign?.id && sortInitiative(campaign.id, campaign.initiativeList);
    const resetInitiativeWrapper = () => campaign?.id && confirm("Limpar toda a iniciativa?") && resetInitiative(campaign.id);

    return (
        <div className="h-screen w-screen bg-black text-foreground font-sans overflow-hidden flex flex-col relative select-none">
            {/* Background Map/Scene */}
            {/* Game Scene Layer (Z-0) */}
            <div className="absolute inset-0 z-0 bg-neutral-900 pointer-events-auto">
                {campaign && (
                    <GameScene
                        campaign={campaign}
                        characters={characters}
                        isMaster={isMaster || false}
                    />
                )}
            </div>

            {/* Main Content Overlay (Click-through) */}
            <div className="relative z-10 h-full flex flex-col pointer-events-none">
                {/* 1. Top Bar (Header) */}
                <header className="h-14 bg-black/80 border-b border-accent/20 flex items-center justify-between px-4 shrink-0 backdrop-blur-md pointer-events-auto">
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
                    <div className="p-2 flex flex-col gap-2 w-[300px] shrink-0 pointer-events-auto">
                        <ChatPanel messages={chatMessages} onSend={(text) => { setMsgInput(text); handleSendMessageWrapper(); }} />
                    </div>

                    {/* Center: Canvas/Map */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {(campaign?.initiativeList?.length || 0) > 0 && (campaign?.round || 1) > 1 && (
                            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-accent px-6 py-2 rounded-full border border-accent/30 shadow-[0_0_20px_rgba(234,179,8,0.2)] backdrop-blur text-xl font-cinzel font-bold animate-in fade-in slide-in-from-top-4 z-50 pointer-events-none">
                                ROUND {campaign.round}
                            </div>
                        )}
                        <div className="mt-auto mb-4 mx-4 flex items-end gap-4 h-[350px] pointer-events-auto">
                            {/* Master Camera - Large Square */}
                            <Card className="h-[350px] w-[350px] bg-black/90 border-none overflow-hidden relative shrink-0 shadow-2xl rounded-xl flex items-center justify-center bg-zinc-950 ring-0">
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                                    {!isMaster && !remoteStream && "Aguardando Mestre..."}
                                </div>
                                {isMaster && (
                                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                )}
                                {!isMaster && remoteStream && (
                                    <video
                                        ref={ref => { if (ref) ref.srcObject = remoteStream; }}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {/* Custom Frame Overlay */}
                                <div className="absolute inset-0 z-20 pointer-events-none">
                                    <img src="/master-frame.png" alt="Master Frame" className="w-full h-full object-fill" />
                                </div>
                                <div className="absolute bottom-10 left-0 right-0 p-2 z-30 pointer-events-none">
                                    <p className="text-xs font-bold text-accent text-center uppercase tracking-widest flex items-center justify-center gap-2 shadow-black drop-shadow-md bg-black/40 backdrop-blur w-fit mx-auto px-3 py-1 rounded-full border border-accent/20">
                                        <Crown className="w-3 h-3" /> Mestre
                                    </p>
                                </div>
                            </Card>

                            <Card className="flex-1 h-full bg-slate-950/90 border-accent/20 backdrop-blur-md flex flex-col p-3 overflow-hidden shadow-2xl relative rounded-xl">
                                {activeTool ? (
                                    <div className="h-full flex flex-col animate-in slide-in-from-right-10 duration-300 min-h-0">
                                        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 shrink-0">
                                            <h3 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                                                {activeTool === 'initiative' ? <><Sword className="w-4 h-4" /> Iniciativa</> :
                                                    activeTool === 'dice' ? <><Dices className="w-4 h-4" /> Rolador</> :
                                                        activeTool === 'chat' ? <><MessageSquare className="w-4 h-4" /> Chat</> :
                                                            activeTool === 'scenes' ? <><MapIcon className="w-4 h-4" /> Cenas & Mapas</> :
                                                                activeTool === 'journal' ? <><Settings className="w-4 h-4" /> Diário</> :
                                                                    activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}
                                            </h3>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500" onClick={() => setActiveTool(null)}>
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* SCENES / MAP MANAGER */}
                                        {activeTool === 'scenes' && isMaster && (
                                            <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">URL do Mapa</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={mapImage}
                                                            onChange={(e) => setMapImage(e.target.value)}
                                                            className="bg-black/50 border-white/10 h-8 text-xs"
                                                            placeholder="https://..."
                                                        />
                                                        <Button size="sm" onClick={() => campaign?.id && updateCampaignData(campaign.id, { activeMapUrl: mapImage })} className="h-8">
                                                            <Send className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">Upload de Mapa</Label>
                                                    <Input type="file" onChange={handleFileUpload} className="bg-black/50 border-white/10 text-xs" />
                                                </div>
                                                <div className="space-y-2 border-t border-white/10 pt-2">
                                                    <Label className="text-xs text-muted-foreground">Fog of War (Em Breve)</Label>
                                                    <Button disabled variant="outline" size="sm" className="w-full h-8 text-xs border-dashed">Ativar Nevoeiro</Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* JOURNAL */}
                                        {activeTool === 'journal' && (
                                            <div className="flex flex-col h-full overflow-hidden">
                                                <ScrollArea className="flex-1 pr-2">
                                                    <div className="flex flex-col gap-2">
                                                        {journalEntries.map((entry: any) => (
                                                            <div key={entry.id} className="bg-black/40 p-2 rounded border border-white/5">
                                                                <p className="text-[10px] text-accent mb-1">{entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : 'Just now'} - {entry.author}</p>
                                                                <p className="text-xs text-zinc-300 whitespace-pre-wrap">{entry.text}</p>
                                                            </div>
                                                        ))}
                                                        {journalEntries.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro.</p>}
                                                    </div>
                                                </ScrollArea>
                                                <div className="mt-2 flex gap-2 pt-2 border-t border-white/5">
                                                    <Input
                                                        value={journalInput}
                                                        onChange={(e) => setJournalInput(e.target.value)}
                                                        placeholder="Novo registro..."
                                                        className="bg-black/50 border-white/10 h-8 text-xs"
                                                    />
                                                    <Button size="sm" onClick={handleAddJournalWrapper} className="h-8"><Send className="w-3 h-3" /></Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* INSPECTOR (Placeholder) */}
                                        {activeTool === 'inspector' && (
                                            <div className="flex flex-col gap-2 text-center py-10">
                                                <Settings className="w-8 h-8 mx-auto text-muted-foreground opacity-50" />
                                                <p className="text-xs text-muted-foreground">Selecione um token no mapa ou clique em um jogador para editar.</p>
                                            </div>
                                        )}

                                        {/* EXISTING TOOLS */}
                                        {activeTool === 'initiative' && (
                                            <InitiativePanel
                                                campaign={campaign}
                                                isMaster={isMaster || false}
                                                onAdd={addToInitiativeWrapper}
                                                onRemove={removeFromInitiativeWrapper}
                                                onNext={nextTurnWrapper}
                                                onSort={sortInitiativeWrapper}
                                                onReset={resetInitiativeWrapper}
                                            />
                                        )}
                                        {activeTool === 'dice' && (
                                            <DicePanel chatMessages={chatMessages} onRoll={rollDice} />
                                        )}
                                    </div>
                                ) : (
                                    <ToolsMenu isMaster={isMaster || false} activeTool={activeTool} onSelectTool={setActiveTool} />
                                )}
                            </Card>
                        </div>
                    </div>

                    {/* Right Sidebar: Player Webcams */}
                    <div className="w-64 bg-slate-950 border-l border-accent/20 flex flex-col p-2 gap-2 overflow-y-auto custom-scrollbar pointer-events-auto">
                        <div className="pb-2 text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Jogadores ({characters.length})</span>
                        </div>

                        {/* Current User Camera (Only if NOT Master) */}
                        {!isMaster && (
                            <div className="aspect-video bg-zinc-900 rounded border border-white/5 relative group overflow-hidden shrink-0">
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <span className="text-xs font-bold text-white">Você</span>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60"><p className="text-xs text-white">{user?.name} (Você)</p></div>
                            </div>
                        )}

                        {/* Other Players (Filter out Master and Self) */}
                        {characters.filter((c: any) => c.userId !== user?.id && c.userId !== campaign?.masterId).map((char: any) => (
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
