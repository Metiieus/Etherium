import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
    Mic, MicOff, Video, VideoOff, MessageSquare, Send,
    Dices, Settings, Shield, Sword, Map as MapIcon,
    ChevronRight, Users, Crown, Upload, Plus, Gift, Zap, LogOut
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

export default function GameSession() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();

    // UI States
    const [msgInput, setMsgInput] = useState("");
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [mapImage, setMapImage] = useState("https://images.unsplash.com/photo-1620644780185-3f6929c3fa9c?q=80&w=2670&auto=format&fit=crop");
    const videoRef = useRef<HTMLVideoElement>(null);

    // Data States
    const [campaign, setCampaign] = useState<any>(null);
    const [characters, setCharacters] = useState<any[]>([]);
    const [xpAmount, setXpAmount] = useState(100);
    const [itemName, setItemName] = useState("");
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [itemImage, setItemImage] = useState("");
    const [itemFile, setItemFile] = useState<File | null>(null);
    // Inspector State
    const [inspectorCharId, setInspectorCharId] = useState<string | null>(null);
    const [damageInput, setDamageInput] = useState(0);
    const [conditionInput, setConditionInput] = useState("Cegueira");
    const [showGiveItem, setShowGiveItem] = useState(false); // Control dialog visibility
    const [abilityPointsInput, setAbilityPointsInput] = useState(0);
    const [inspectorView, setInspectorView] = useState<'combat' | 'sheet'>('combat');

    // WebRTC Logic
    const isMaster = campaign?.masterId === user?.id; // Re-computed later but needed for hook
    const { remoteStream, setLocalStream } = useWebRTC(id, user?.id, isMaster || false);

    // Chat State with Explicit Type
    const [chatMessages, setChatMessages] = useState<{ id: string | number; user: string; text: string; time: string; role: string; }[]>([
        { id: 1, user: "Sistema", text: "Bem-vindo à sessão de jogo!", time: "Agora", role: "system" },
    ]);

    // Computed
    const playerCharacter = characters.find(c => c.userId === user?.id);
    const selectedCharForInspector = characters.find(c => c.id === inspectorCharId);

    // Fetch Campaign & Characters
    useEffect(() => {
        if (!id) return;

        // Fetch Campaign
        getDoc(doc(db, "campaigns", id)).then(snap => {
            if (snap.exists()) setCampaign({ id: snap.id, ...snap.data() });
        });

        // Fetch Characters
        const q = query(collection(db, "characters"), where("campaignId", "==", id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCharacters(chars);
        });
        return () => unsubscribe();
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
            logSystemAction(`Concedeu o item ${item} para ${characters.find(c => c.id === charId)?.name}.`, 'master');
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
            const char = characters.find(c => c.id === charId);
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
            const char = characters.find(c => c.id === charId);
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
            const char = characters.find(c => c.id === charId);
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

    return (
        <div className="h-screen w-screen bg-black text-foreground overflow-hidden flex flex-col font-sans">

            {/* Consolidated Dialogs (Outside Loop) */}
            <Dialog open={showGiveItem} onOpenChange={setShowGiveItem}>
                <DialogContent className="bg-slate-950 border-accent/20 text-foreground">
                    <DialogHeader><DialogTitle>Dar Carta de Item</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Nome da Carta</Label>
                            <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: Espada Vorpal" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Imagem da Carta</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="item-upload-global"
                                        onChange={handleItemUpload}
                                    />
                                    <Button variant="secondary" className="w-full text-xs" onClick={() => document.getElementById('item-upload-global')?.click()}>
                                        <Upload className="w-3 h-3 mr-2" /> Upload Imagem
                                    </Button>
                                </div>
                            </div>
                            {itemImage && (
                                <div className="relative h-32 w-full rounded border border-accent/20 overflow-hidden mt-2 group">
                                    <img src={itemImage} className="w-full h-full object-contain bg-black/50" />
                                    <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setItemImage("")}>
                                        <LogOut className="w-3 h-3 rotate-180" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => {
                                if (selectedCharId) {
                                    giveItem(selectedCharId, itemName, itemImage);
                                    setShowGiveItem(false);
                                }
                            }}
                            className="w-full bg-accent text-black hover:bg-yellow-500 font-bold"
                            disabled={!itemName || !itemImage}
                        >
                            ENVIAR PARA {characters.find(c => c.id === selectedCharId)?.name}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Main Layout Grid */}
            <div className="flex-1 flex overflow-hidden">

                {/* Center Column: Game Screen + Bottom Bar */}
                <div className="flex-1 flex flex-col min-w-0">

                    {/* TOP: Game Screen (Map/Canvas) */}
                    <div className="flex-1 bg-slate-900/50 relative border-b border-accent/20 m-2 rounded-lg overflow-hidden group">
                        {/* Placeholder Map Background */}
                        <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity" style={{ backgroundImage: `url('${mapImage}')` }} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <MapIcon className="w-16 h-16 text-accent/20 mx-auto mb-4" />
                                <h2 className="text-3xl font-cinzel text-accent/40 font-bold uppercase tracking-[0.5em]">Tela do Jogo</h2>
                                <p className="text-slate-500 font-lora text-sm mt-2">Mapa Tático Interativo</p>
                            </div>
                        </div>

                        {/* Overlay Controls (Zoom, Layers, etc) Placeholder */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                            {/* Exit Button - New */}
                            <div className="bg-black/80 backdrop-blur border border-red-500/30 rounded-lg p-2 flex flex-col gap-2">
                                <Button size="icon" variant="ghost" className="hover:text-red-500 hover:bg-red-500/10 text-red-500/50" onClick={handleExit} title="Sair do Jogo">
                                    <LogOut className="w-4 h-4" />
                                </Button>
                            </div>
                            {/* Settings Button - Existing */}
                            <div className="bg-black/80 backdrop-blur border border-accent/20 rounded-lg p-2 flex flex-col gap-2 mt-2">
                                <Button size="icon" variant="ghost" className="hover:text-accent"><Settings className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </div>

                    {/* PLAYER SELF-VIEW CAMERA (Absolute on Map) */}
                    {!isMaster && (
                        <div className="absolute bottom-4 right-4 w-32 h-24 bg-black border border-accent/50 rounded overflow-hidden shadow-lg z-20 group">
                            {isCamOn ? (
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                    <VideoOff className="w-8 h-8 text-white/20" />
                                </div>
                            )}
                            <div className="absolute bottom-1 right-1 flex gap-1 bg-black/50 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-4 w-4 text-white" onClick={() => setIsMicOn(!isMicOn)}>
                                    {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-red-500" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-4 w-4 text-white" onClick={() => setIsCamOn(!isCamOn)}>
                                    <Video className="w-3 h-3" />
                                </Button>
                            </div>
                            <span className="absolute top-1 left-1 text-[8px] font-bold bg-black/50 text-white px-1 rounded">VOCÊ</span>
                        </div>
                    )}

                    {/* BOTTOM: Chat | Master Cam | Tools */}
                    <div className="h-[350px] flex gap-2 p-2 pt-0">

                        {/* 1. Chat (Left) */}
                        <Card className="w-[300px] bg-slate-950/80 border-accent/20 flex flex-col overflow-hidden backdrop-blur-sm shrink-0">
                            <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> Chat do Grupo
                                </span>
                            </div>
                            <ScrollArea className="flex-1 p-3 space-y-3">
                                {chatMessages.map(msg => (
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
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    autoComplete="off"
                                />
                                <Button size="icon" onClick={handleSendMessage} className="h-8 w-8 bg-accent text-black hover:bg-yellow-500">
                                    <Send className="w-3 h-3" />
                                </Button>
                            </div>
                        </Card>

                        {/* 2. Master Webcam (Center - Resized to Square) */}
                        <Card className="w-[350px] bg-black border-accent/40 relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] shrink-0">
                            <div className="absolute top-2 left-2 z-10 bg-accent/90 text-black px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                                <Crown className="w-3 h-3" /> Mestre
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 overflow-hidden">
                                {isMaster ? (
                                    // If Master: Show Local Cam
                                    isCamOn ? (
                                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center">
                                            <VideoOff className="w-12 h-12 mb-2 opacity-20" />
                                            <span className="text-xs uppercase tracking-widest opacity-50">Câmera Desligada</span>
                                        </div>
                                    )
                                ) : (
                                    // If Player: Show Placeholder (or Remote Stream later)
                                    // If Player: Show Remote Stream
                                    <div className="w-full h-full bg-zinc-900 relative group">
                                        {remoteStream ? (
                                            <video
                                                ref={(ref) => { if (ref) ref.srcObject = remoteStream; }}
                                                autoPlay playsInline
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col p-4 text-center">
                                                <span className="text-xs text-white/50 uppercase tracking-widest mb-1">Câmera do Mestre</span>
                                                <span className="text-[10px] text-accent/50 italic">(Aguardando sinal...)</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isMaster && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur rounded-full p-2 border border-white/10">
                                    <Button size="icon" variant={isMicOn ? "default" : "destructive"} className={`h-8 w-8 rounded-full ${isMicOn ? 'bg-white/10 hover:bg-white/20' : ''}`} onClick={() => setIsMicOn(!isMicOn)}>
                                        {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                    </Button>
                                    <Button size="icon" variant={isCamOn ? "default" : "destructive"} className={`h-8 w-8 rounded-full ${isCamOn ? 'bg-white/10 hover:bg-white/20' : ''}`} onClick={() => setIsCamOn(!isCamOn)}>
                                        {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* 3. Master Tools (Updated Inspector & Journal) */}
                        <Card className="flex-1 bg-slate-950/80 border-accent/20 backdrop-blur-sm p-4 flex flex-col gap-4 relative min-w-0">
                            {activeTool ? (
                                <div className="h-full flex flex-col animate-in slide-in-from-right-10 duration-300 min-h-0">
                                    <div className="flex items-center justify-between mb-2 shrink-0">
                                        <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
                                            {activeTool === 'inspector' ? 'Inspetor' :
                                                activeTool === 'journal' ? 'Diário' :
                                                    activeTool === 'dice' ? 'Dados' :
                                                        activeTool === 'sheet' ? 'Sua Ficha' :
                                                            activeTool === 'inventory' ? 'Seu Inventário' :
                                                                'Ferramenta'}
                                        </h3>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setActiveTool(null); setInspectorCharId(null); setInspectorView('combat'); }}><ChevronRight className="w-4 h-4" /></Button>
                                    </div>

                                    {/* INSPECTOR TOOL */}
                                    {activeTool === 'inspector' && (
                                        selectedCharForInspector ? (
                                            <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
                                                {/* Header Stats & Toggle */}
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3 shrink-0">
                                                    <Avatar className="h-12 w-12 border border-accent/50">
                                                        <AvatarImage src={selectedCharForInspector.avatarUrl} />
                                                        <AvatarFallback>{selectedCharForInspector.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-sm leading-none text-white">{selectedCharForInspector.name}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button
                                                                size="sm" variant={inspectorView === 'combat' ? "secondary" : "ghost"}
                                                                className="h-5 text-[10px] px-2"
                                                                onClick={() => setInspectorView('combat')}
                                                            >
                                                                Combate
                                                            </Button>
                                                            <Button
                                                                size="sm" variant={inspectorView === 'sheet' ? "secondary" : "ghost"}
                                                                className="h-5 text-[10px] px-2"
                                                                onClick={() => setInspectorView('sheet')}
                                                            >
                                                                Ficha
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setInspectorCharId(null)} className="text-[10px] text-muted-foreground">Trocar</Button>
                                                </div>

                                                {/* NATIVE SCROLL DIV instead of ScrollArea */}
                                                <div className="flex-1 overflow-y-auto -mr-2 pr-2 custom-scrollbar">
                                                    {inspectorView === 'combat' ? (
                                                        <div className="space-y-4 pr-1">
                                                            {/* Status Vitals */}
                                                            <div className="space-y-3 bg-black/20 p-2 rounded border border-white/5">
                                                                {/* HP Bar logic remains same */}
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                                                                        <span>Vida (HP)</span>
                                                                        <span className={selectedCharForInspector.hp < (selectedCharForInspector.maxHp / 2) ? "text-red-500" : "text-green-500"}>
                                                                            {selectedCharForInspector.hp || 0} / {selectedCharForInspector.maxHp || 100}
                                                                        </span>
                                                                    </div>
                                                                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                                                        <div
                                                                            className="h-full transition-all duration-500 bg-gradient-to-r from-red-900 to-red-600"
                                                                            style={{ width: `${Math.min(100, ((selectedCharForInspector.hp || 0) / (selectedCharForInspector.maxHp || 100)) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                                                        <div className="flex gap-1">
                                                                            <Input type="number" value={damageInput} onChange={e => setDamageInput(Number(e.target.value))} className="h-6 text-[10px] bg-black/50" placeholder="Qtd" />
                                                                            <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => applyDamage(selectedCharForInspector.id, damageInput, 'damage')}>-</Button>
                                                                            <Button size="icon" className="h-6 w-6 bg-green-600 hover:bg-green-700" onClick={() => applyDamage(selectedCharForInspector.id, damageInput, 'heal')}>+</Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Ability Points remains same */}
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                                                                        <span>Pontos de Habilidade</span>
                                                                        <span className="text-blue-400">{selectedCharForInspector.abilityPoints || 0} / {selectedCharForInspector.maxAbilityPoints || 10}</span>
                                                                    </div>
                                                                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                                                                        <div
                                                                            className="h-full transition-all duration-500 bg-blue-500"
                                                                            style={{ width: `${Math.min(100, ((selectedCharForInspector.abilityPoints || 0) / (selectedCharForInspector.maxAbilityPoints || 10)) * 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-1 items-center mt-1">
                                                                        <Button size="sm" variant="outline" className="h-5 text-[9px] px-2 border-blue-500/30 text-blue-400" onClick={() => updateAbilityPoints(selectedCharForInspector.id, -1)}>-1</Button>
                                                                        <Button size="sm" variant="outline" className="h-5 text-[9px] px-2 border-blue-500/30 text-blue-400" onClick={() => updateAbilityPoints(selectedCharForInspector.id, 1)}>+1</Button>
                                                                        <span className="text-[9px] text-muted-foreground ml-auto">Mana / Energia</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Conditions */}
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <Label className="text-[10px] uppercase text-muted-foreground">Condições</Label>
                                                                    <div className="flex gap-1">
                                                                        <select
                                                                            className="bg-black border border-white/10 text-[10px] h-5 rounded px-1 w-24"
                                                                            value={conditionInput}
                                                                            onChange={e => setConditionInput(e.target.value)}
                                                                        >
                                                                            <option>Cegueira</option>
                                                                            <option>Envenenado</option>
                                                                            <option>Invisível</option>
                                                                            <option>Caído</option>
                                                                            <option>Atordoado</option>
                                                                            <option>Amaldiçoado</option>
                                                                        </select>
                                                                        <Button size="icon" variant="secondary" className="h-5 w-5" onClick={() => toggleCondition(selectedCharForInspector.id, conditionInput)}>
                                                                            <Plus className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 flex-wrap min-h-[30px] p-2 bg-black/20 rounded border border-white/5 border-dashed">
                                                                    {selectedCharForInspector.conditions?.length > 0 ? selectedCharForInspector.conditions.map((cond: string) => (
                                                                        <div key={cond} className="bg-red-900/20 border border-red-500/40 text-[9px] px-2 py-1 rounded flex items-center gap-1 text-red-300 animate-in fade-in zoom-in">
                                                                            {cond}
                                                                            <button onClick={() => toggleCondition(selectedCharForInspector.id, cond)} className="hover:text-white ml-1"><LogOut className="w-2 h-2" /></button>
                                                                        </div>
                                                                    )) : <span className="text-[9px] text-muted-foreground italic w-full text-center">Nenhuma condição ativa</span>}
                                                                </div>
                                                            </div>

                                                            {/* Inventory */}
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] uppercase text-muted-foreground">Itens & Equipamentos</Label>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {selectedCharForInspector.inventory?.filter((i: any) => i.type === 'card').map((item: any, idx: number) => (
                                                                        <div key={idx} className="aspect-[2/3] bg-black border border-white/10 rounded overflow-hidden relative group hover:border-accent/50 transition-colors">
                                                                            <img src={item.imageUrl} className="w-full h-full object-cover" title={item.name} />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                <span className="text-[8px] text-white font-bold text-center px-1">{item.name}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {(!selectedCharForInspector.inventory || selectedCharForInspector.inventory.filter((i: any) => i.type === 'card').length === 0) && (
                                                                        <div className="col-span-3 text-[10px] text-muted-foreground italic text-center py-4 bg-white/5 rounded border border-white/5 border-dashed">
                                                                            Mochila vazia
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // SHEET VIEW
                                                        <div className="space-y-4 pr-1">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(attr => (
                                                                    <div key={attr} className="bg-black/30 p-2 rounded border border-white/5 flex flex-col items-center gap-1 group hover:border-accent/30 transition-colors">
                                                                        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{attr === 'strength' ? 'FOR' : attr === 'dexterity' ? 'DES' : attr === 'constitution' ? 'CON' : attr === 'intelligence' ? 'INT' : attr === 'wisdom' ? 'SAB' : 'CAR'}</span>
                                                                        <span className="text-xl font-cinzel font-bold text-white">{selectedCharForInspector[attr] || 10}</span>
                                                                        <span className="text-xs font-bold text-accent bg-accent/10 px-2 rounded">
                                                                            {Math.floor(((selectedCharForInspector[attr] || 10) - 10) / 2) >= 0 ? '+' : ''}{Math.floor(((selectedCharForInspector[attr] || 10) - 10) / 2)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="space-y-2 bg-white/5 p-3 rounded">
                                                                <h4 className="text-xs font-bold text-accent mb-2">Resumo de Combate</h4>
                                                                <div className="flex justify-between text-sm py-1 border-b border-white/5">
                                                                    <span className="text-muted-foreground">Classe de Armadura</span>
                                                                    <span className="font-bold text-white">{selectedCharForInspector.armorClass || 10}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm py-1 border-b border-white/5">
                                                                    <span className="text-muted-foreground">Iniciativa</span>
                                                                    <span className="font-bold text-white">+{Math.floor(((selectedCharForInspector.dexterity || 10) - 10) / 2)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm py-1 border-b border-white/5">
                                                                    <span className="text-muted-foreground">Percepção Passiva</span>
                                                                    <span className="font-bold text-white">{10 + Math.floor(((selectedCharForInspector.wisdom || 10) - 10) / 2)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm py-1">
                                                                    <span className="text-muted-foreground">Proficiência</span>
                                                                    <span className="font-bold text-white">+{2 + Math.floor(((selectedCharForInspector.level || 1) - 1) / 4)}</span>
                                                                </div>
                                                            </div>

                                                            <div className="text-[10px] text-center text-muted-foreground italic mt-4">
                                                                Apenas visualização. Edição em breve.
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                                <p className="text-[10px] text-muted-foreground text-center mb-2">Selecione um jogador para inspecionar:</p>
                                                <div className="flex-1 overflow-y-auto -mx-2 px-2 custom-scrollbar space-y-2">
                                                    {characters.map(char => (
                                                        <button
                                                            key={char.id}
                                                            onClick={() => setInspectorCharId(char.id)}
                                                            className="w-full bg-slate-900/50 hover:bg-slate-800 p-2 rounded border border-white/5 hover:border-accent/30 flex items-center gap-3 transition-colors text-left group"
                                                        >
                                                            <Avatar className="h-8 w-8 border border-white/10 group-hover:border-accent/50">
                                                                <AvatarImage src={char.avatarUrl} />
                                                                <AvatarFallback>{char.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className="text-xs font-bold text-slate-200 group-hover:text-accent truncate">{char.name}</p>
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                    <span className={`${char.hp < (char.maxHp / 2) ? 'text-red-500' : 'text-green-500'}`}>{char.hp || 0} HP</span>
                                                                    <span>•</span>
                                                                    <span className="text-blue-400">{char.abilityPoints || 0} PH</span>
                                                                </div>
                                                            </div>
                                                            {char.conditions?.length > 0 && (
                                                                <div className="flex -space-x-1">
                                                                    {char.conditions.map((c: string, i: number) => (
                                                                        <div key={i} className="w-2 h-2 rounded-full bg-red-500 border border-black" title={c} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {/* PLAYER SHEET TOOL (Reusing logic for self) */}
                                    {activeTool === 'sheet' && playerCharacter && (
                                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 custom-scrollbar space-y-4">
                                            {/* Header */}
                                            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                <Avatar className="h-16 w-16 border border-accent/50">
                                                    <AvatarImage src={playerCharacter.avatarUrl} />
                                                    <AvatarFallback>{playerCharacter.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h2 className="text-lg font-cinzel font-bold text-white">{playerCharacter.name}</h2>
                                                    <p className="text-xs text-muted-foreground">{playerCharacter.race} {playerCharacter.class} • Nível {playerCharacter.level}</p>
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-3 bg-black/30 p-2 rounded border border-white/5 flex justify-between items-center">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase">HP</span>
                                                    <div className="text-right">
                                                        <span className="text-lg font-bold text-green-500">{playerCharacter.hp}</span>
                                                        <span className="text-xs text-muted-foreground">/{playerCharacter.maxHp}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-black/30 p-2 rounded border border-white/5 flex flex-col items-center">
                                                    <span className="text-[10px] text-muted-foreground uppercase">CA</span>
                                                    <span className="text-lg font-bold text-white">{playerCharacter.armorClass}</span>
                                                </div>
                                                <div className="bg-black/30 p-2 rounded border border-white/5 flex flex-col items-center">
                                                    <span className="text-[10px] text-muted-foreground uppercase">Inic</span>
                                                    <span className="text-lg font-bold text-white">+{Math.floor(((playerCharacter.dexterity || 10) - 10) / 2)}</span>
                                                </div>
                                                <div className="bg-black/30 p-2 rounded border border-white/5 flex flex-col items-center">
                                                    <span className="text-[10px] text-muted-foreground uppercase">Perc</span>
                                                    <span className="text-lg font-bold text-white">{10 + Math.floor(((playerCharacter.wisdom || 10) - 10) / 2)}</span>
                                                </div>
                                            </div>

                                            {/* Attributes */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(attr => (
                                                    <div key={attr} className="bg-black/20 p-2 rounded border border-white/5 flex justify-between items-center">
                                                        <span className="text-[10px] uppercase text-muted-foreground font-bold">{attr.substring(0, 3)}</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-white">{playerCharacter[attr] || 10}</span>
                                                            <span className="text-[10px] text-accent">
                                                                ({Math.floor(((playerCharacter[attr] || 10) - 10) / 2) >= 0 ? '+' : ''}{Math.floor(((playerCharacter[attr] || 10) - 10) / 2)})
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* PLAYER INVENTORY TOOL */}
                                    {activeTool === 'inventory' && playerCharacter && (
                                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 custom-scrollbar">
                                            <div className="grid grid-cols-2 gap-2">
                                                {playerCharacter.inventory?.filter((i: any) => i.type === 'card').map((item: any, idx: number) => (
                                                    <div key={idx} className="aspect-[2/3] bg-black border border-white/10 rounded overflow-hidden relative group hover:border-accent/50 transition-colors cursor-pointer" onClick={() => { setItemImage(item.imageUrl); setShowGiveItem(true); /* Reuse dialog for viewing? Or make new ViewDialog */ }}>
                                                        <img src={item.imageUrl} className="w-full h-full object-cover" title={item.name} />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex items-end justify-center pb-2">
                                                            <span className="text-[10px] text-white font-bold text-center px-1 truncate w-full">{item.name}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!playerCharacter.inventory || playerCharacter.inventory.filter((i: any) => i.type === 'card').length === 0) && (
                                                    <div className="col-span-2 text-xs text-muted-foreground italic text-center py-8 border border-white/5 border-dashed rounded">
                                                        Mochila vazia...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* JOURNAL TOOL (Already handled but ensure button directs here) */}
                                    {activeTool === 'journal' && (
                                        <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
                                            <div className="flex-1 overflow-y-auto bg-black/20 rounded p-2 border border-white/5 space-y-2 custom-scrollbar">
                                                {/* Real Journal Entries */}
                                                {journalEntries.length === 0 && <p className="text-[10px] text-muted-foreground italic p-2">Nenhum registro ainda.</p>}
                                                {journalEntries.map(entry => (
                                                    <div key={entry.id} className="p-2 border-b border-white/5 last:border-0">
                                                        <span className="text-[10px] text-accent font-bold">{entry.displayDate || "Data Desconhecida"}</span>
                                                        <p className="text-xs font-lora text-slate-300 whitespace-pre-wrap">{entry.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Textarea
                                                    className="h-16 bg-black/50 border-white/10 text-xs resize-none"
                                                    placeholder="Adicionar nota ao diário..."
                                                    value={journalInput}
                                                    onChange={e => setJournalInput(e.target.value)}
                                                />
                                                <Button size="icon" className="h-16 w-12 bg-accent text-black hover:bg-yellow-500" onClick={handleAddJournal}><Plus className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* PARTY TOOL (Selection only) */}
                                    {activeTool === 'party' && (
                                        <div className="flex-1 overflow-y-auto -mx-2 px-2 custom-scrollbar">
                                            {/* Simplified Party List for Basic Actions (XP/Items) */}
                                            <div className="space-y-2">
                                                {characters.map(char => (
                                                    <div key={char.id} className="bg-slate-900/50 p-2 rounded border border-white/5 flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6 border border-accent/30">
                                                                <AvatarImage src={char.avatarUrl} />
                                                                <AvatarFallback>{char.name[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs font-bold truncate flex-1">{char.name}</span>
                                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:text-accent" onClick={() => { setInspectorCharId(char.id); setActiveTool('inspector'); }}>
                                                                <Settings className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setSelectedCharId(char.id); setXpAmount(100); }}><Zap className="w-3 h-3 mr-1" /> XP</Button>
                                                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setSelectedCharId(char.id); setShowGiveItem(true); }}><Gift className="w-3 h-3 mr-1" /> Item</Button>
                                                        </div>
                                                        {selectedCharId === char.id && !showGiveItem && (
                                                            <div className="flex items-center gap-1">
                                                                <Input type="number" value={xpAmount} onChange={e => setXpAmount(Number(e.target.value))} className="h-6 text-[10px]" />
                                                                <Button size="icon" className="h-6 w-6" onClick={() => { giveXp(char.id, xpAmount); setSelectedCharId(null); }}><Plus className="w-3 h-3" /></Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ... (Existing Dice/Scenes render blocks) ... */}
                                    {activeTool === 'dice' && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {[4, 6, 8, 10, 12, 20, 100].map(die => (
                                                <Button key={die} onClick={() => rollDice(die)} variant="outline" className="h-10 border-accent/20 hover:bg-accent hover:text-black font-cinzel text-xs p-0">
                                                    d{die}
                                                </Button>
                                            ))}
                                        </div>
                                    )}

                                    {activeTool === 'scenes' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase text-muted-foreground">Upload do PC</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input id="map-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                                    <Button variant="secondary" className="w-full h-8 text-xs gap-2" onClick={() => document.getElementById('map-upload')?.click()}>
                                                        <Upload className="w-3 h-3" /> Escolher
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Input placeholder="Cole URL..." className="h-8 text-xs bg-black/40 border-accent/20" onKeyDown={(e) => { if (e.key === 'Enter') { setMapImage((e.target as HTMLInputElement).value); toast({ title: "Cena Alterada!" }); setActiveTool(null); } }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-accent/10 pb-2">Ferramentas</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {isMaster ? (
                                            <>
                                                <Button onClick={() => setActiveTool('inspector')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 relative group overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Settings className="w-6 h-6" /><span className="text-xs">Inspetor</span>
                                                </Button>
                                                <Button onClick={() => setActiveTool('journal')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><ScrollArea className="w-6 h-6" /><span className="text-xs">Diário</span></Button>
                                                <Button onClick={() => setActiveTool('dice')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><Dices className="w-6 h-6" /><span className="text-xs">Dados</span></Button>
                                                <Button onClick={() => setActiveTool('scenes')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><MapIcon className="w-6 h-6" /><span className="text-xs">Cenas</span></Button>
                                                <Button onClick={() => setActiveTool('party')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><Users className="w-6 h-6" /><span className="text-xs">Grupo</span></Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button onClick={() => setActiveTool('sheet')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2 relative group overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Shield className="w-6 h-6" /><span className="text-xs">Ficha</span>
                                                </Button>
                                                <Button onClick={() => setActiveTool('inventory')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><Sword className="w-6 h-6" /><span className="text-xs">Inventário</span></Button>
                                                <Button onClick={() => setActiveTool('journal')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><ScrollArea className="w-6 h-6" /><span className="text-xs">Diário</span></Button>
                                                <Button onClick={() => setActiveTool('dice')} variant="outline" className="border-accent/30 hover:bg-accent/10 hover:text-accent h-20 flex flex-col gap-2"><Dices className="w-6 h-6" /><span className="text-xs">Dados</span></Button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </Card>
                    </div>
                </div>

                {/* Right Sidebar: Player Webcams */}
                <div className="w-64 bg-slate-950 border-l border-accent/20 flex flex-col p-2 gap-2 overflow-y-auto custom-scrollbar">
                    <div className="pb-2 text-center">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Jogadores ({characters.length})</span>
                    </div>

                    {characters.map((char) => {
                        const isMyCharacter = char.userId === user?.id; // Check if this is the current player

                        return (
                            <div key={char.id} className="aspect-video bg-zinc-900 rounded border border-white/5 relative group overflow-hidden shrink-0">
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-zinc-800 overflow-hidden">
                                    {/* If Master, see User Avatar. If Player AND My Character, see My Local Cam. Else see Avatar */}
                                    {!isMaster && isMyCharacter && isCamOn ? (
                                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900/50">
                                            <Avatar className={`h-12 w-12 border mb-2 shadow-lg transition-all ${char.isOnline ? 'border-green-500/50 grayscale-0' : 'border-white/10 grayscale opacity-50'}`}>
                                                <AvatarImage src={char.avatarUrl} className="object-cover" />
                                                <AvatarFallback className="bg-slate-800 text-accent font-cinzel font-bold">{char.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex items-center gap-1.5 opacity-80">
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${char.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <span className={`text-[9px] uppercase tracking-widest font-semibold ${char.isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                    {char.isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                                    <p className="text-xs font-bold text-white shadow-black drop-shadow-md">{char.name}</p>
                                    {!isMaster && isMyCharacter && (
                                        <div className="flex gap-1">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isMicOn ? 'bg-white/10' : 'bg-red-500/50'}`} onClick={() => setIsMicOn(!isMicOn)}>
                                                {isMicOn ? <Mic className="w-2 h-2" /> : <MicOff className="w-2 h-2" />}
                                            </div>
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isCamOn ? 'bg-white/10' : 'bg-red-500/50'}`} onClick={() => setIsCamOn(!isCamOn)}>
                                                {isCamOn ? <Video className="w-2 h-2" /> : <VideoOff className="w-2 h-2" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
