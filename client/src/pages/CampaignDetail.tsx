import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { Loader2, Users, Share2, Shield, Gift, Zap, Settings, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/_core/hooks/useAuth";

interface Campaign {
    id: string;
    name: string;
    description: string;
    system: string;
    masterId: string;
    status: string;
}

interface Character {
    id: string;
    name: string;
    race: string;
    class: string;
    level: number;
    userId: string;
    userEmail?: string; // Optional, maybe fetch from connection
}

export default function CampaignDetail() {
    const params = useParams();
    const campaignId = params.id || "";
    const { user } = useAuth();
    const { toast } = useToast();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [players, setPlayers] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Grant Item State
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [targetPlayerId, setTargetPlayerId] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemImageUrl, setItemImageUrl] = useState("");
    const [isGranting, setIsGranting] = useState(false);

    const handleGrantItem = async () => {
        if (!targetPlayerId || !itemName || !itemImageUrl) {
            toast({ title: "Preencha todos os campos", variant: "destructive" });
            return;
        }

        setIsGranting(true);
        try {
            const charRef = doc(db, "characters", targetPlayerId);
            const charSnap = await getDoc(charRef);

            if (charSnap.exists()) {
                const currentInv = charSnap.data().inventory || [];
                const newItem = {
                    type: "card",
                    name: itemName,
                    imageUrl: itemImageUrl,
                    addedAt: new Date().toISOString()
                };

                await updateDoc(charRef, {
                    inventory: [...currentInv, newItem]
                });

                toast({ title: "Item enviado com sucesso!" });
                setIsItemDialogOpen(false);
                setTargetPlayerId("");
                setItemName("");
                setItemImageUrl("");
            }
        } catch (error) {
            console.error("Error granting item:", error);
            toast({ title: "Erro ao enviar item", variant: "destructive" });
        } finally {
            setIsGranting(false);
        }
    };

    useEffect(() => {
        const fetchCampaignData = async () => {
            if (!campaignId) return;
            try {
                // Fetch Campaign Details
                const campRef = doc(db, "campaigns", campaignId);
                const campSnap = await getDoc(campRef);

                if (campSnap.exists()) {
                    setCampaign({ id: campSnap.id, ...campSnap.data() } as Campaign);

                    // Fetch Players (Characters linked to this campaign)
                    // Note: We haven't implemented linking yet, so this will return empty for now
                    const playersQ = query(collection(db, "characters"), where("campaignId", "==", campaignId));
                    const playersSnap = await getDocs(playersQ);
                    const loadedPlayers: Character[] = [];
                    playersSnap.forEach(doc => {
                        loadedPlayers.push({ id: doc.id, ...doc.data() } as Character);
                    });
                    setPlayers(loadedPlayers);

                } else {
                    toast({ title: "Campanha não encontrada", variant: "destructive" });
                }
            } catch (error) {
                console.error("Error loading campaign:", error);
                toast({ title: "Erro ao carregar campanha", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaignData();
    }, [campaignId]);

    const copyInviteLink = () => {
        const url = `${window.location.origin}/campaigns/join/${campaignId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link de convite copiado!", description: "Envie para seus jogadores." });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent w-12 h-12" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <h1 className="text-2xl font-bold text-muted-foreground">Campanha não encontrada</h1>
                <Link href="/master"><Button>Voltar ao Painel</Button></Link>
            </div>
        );
    }

    // Security check: Only Master can see this
    if (user && user.id !== campaign.masterId) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
                <p className="text-muted-foreground">Você não é o mestre desta campanha.</p>
                <Link href="/profile"><Button>Voltar ao Perfil</Button></Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700">
            {/* Header */}
            <header className="border-b border-border bg-card/20 backdrop-blur-sm sticky top-0 z-50">
                <div className="container py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/master">
                            <Button variant="ghost" className="text-muted-foreground hover:text-accent font-cinzel">
                                ← Voltar
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold font-cinzel text-foreground truncate max-w-[200px] md:max-w-md">
                            {campaign.name}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/session/${campaign.id}`}>
                            <Button className="bg-red-900/80 text-white hover:bg-red-800 border-red-500/30 border gap-2 font-bold shadow-sm font-cinzel animate-pulse">
                                <Sword className="w-4 h-4" />
                                <span className="hidden md:inline">Entrar no Jogo</span>
                            </Button>
                        </Link>
                        <Button onClick={copyInviteLink} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-bold shadow-sm">
                            <Share2 className="w-4 h-4" />
                            <span className="hidden md:inline">Convidar</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container py-8 space-y-8">
                {/* Stats / Info */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Sistema</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-cinzel text-foreground">{campaign.system}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Jogadores</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-cinzel text-foreground flex items-center gap-2">
                                <Users className="w-6 h-6 text-accent" />
                                {players.length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-cinzel text-green-500 uppercase">{campaign.status}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Control Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="bg-background/50 border border-accent/20 w-full justify-start overflow-x-auto">
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="players">Jogadores & Fichas</TabsTrigger>
                        <TabsTrigger value="actions" className="text-accent">Ações Divinas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                        <Card className="bg-card/40 border-accent/10">
                            <CardHeader>
                                <CardTitle className="font-cinzel text-accent">Descrição da Campanha</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-lora text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {campaign.description}
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="players" className="mt-6">
                        {players.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-accent/10 rounded-xl bg-card/20">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-cinzel text-muted-foreground">A Taverna está Vazia</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Nenhum jogador se juntou à campanha ainda.
                                </p>
                                <Button onClick={copyInviteLink} variant="outline" className="border-accent/30 text-accent">
                                    Copiar Link de Convite
                                </Button>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {players.map(player => (
                                    <Link key={player.id} href={`/characters/${player.id}`}>
                                        <div className="block cursor-pointer group">
                                            <Card className="bg-card/40 border-accent/20 hover:border-accent/60 transition-all overflow-hidden">
                                                <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                                                    <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-lg bg-slate-950 border border-accent/40 flex items-center justify-center text-2xl font-cinzel text-accent">
                                                        {player.name.charAt(0)}
                                                    </div>
                                                </div>
                                                <CardContent className="pt-8 pb-4">
                                                    <h3 className="text-lg font-bold font-cinzel text-foreground group-hover:text-accent transition-colors">{player.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{player.race} {player.class} • Lvl {player.level}</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="actions" className="mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="bg-card/40 border-accent/20 hover:bg-card/60 transition-colors">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-cinzel text-foreground">Conceder Experiência</CardTitle>
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Distribua XP para o grupo inteiro ou jogadores específicos.</p>
                                    <div className="mt-4">
                                        <Button variant="outline" className="w-full" disabled>Em breve</Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                                <DialogTrigger asChild>
                                    <Card className="bg-card/40 border-accent/20 hover:bg-card/60 transition-all cursor-pointer group">
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-lg font-cinzel text-foreground group-hover:text-accent font-bold transition-colors">Presentear Item (Card)</CardTitle>
                                            <Gift className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground group-hover:text-slate-300">Envie uma carta de item diretamente para o inventário de um jogador.</p>
                                            <div className="mt-4">
                                                <Button className="w-full bg-accent text-accent-foreground font-bold">Enviar Item</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-accent/20">
                                    <DialogHeader>
                                        <DialogTitle className="font-cinzel text-accent">Enviar Carta de Item</DialogTitle>
                                        <DialogDescription>
                                            Escolha o destinatário e faça o upload da imagem da carta.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Destinatário</Label>
                                            <select
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={targetPlayerId}
                                                onChange={e => setTargetPlayerId(e.target.value)}
                                            >
                                                <option value="">Selecione um jogador...</option>
                                                {players.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.class})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nome do Item</Label>
                                            <Input
                                                placeholder="Ex: Adaga Rúnica"
                                                value={itemName}
                                                onChange={e => setItemName(e.target.value)}
                                                className="bg-background/50 border-accent/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Imagem da Carta (Upload)</Label>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setItemImageUrl(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="bg-background/50 border-accent/20 file:bg-accent file:text-accent-foreground file:border-0 file:rounded-md file:px-2 file:text-sm file:font-semibold hover:file:bg-accent/80"
                                            />
                                            {itemImageUrl && (
                                                <div className="aspect-[2/3] w-32 mx-auto rounded overflow-hidden border border-accent/20 relative mt-2 bg-black">
                                                    <img src={itemImageUrl} alt="Preview" className="object-cover w-full h-full" />
                                                </div>
                                            )}
                                        </div>
                                        <Button onClick={handleGrantItem} className="w-full bg-accent text-accent-foreground font-bold" disabled={isGranting}>
                                            {isGranting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
                                            Conceder Item
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Card className="bg-card/40 border-accent/20 hover:bg-card/60 transition-colors cursor-not-allowed opacity-50">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-cinzel text-foreground">Configurações</CardTitle>
                                    <Settings className="h-5 w-5 text-slate-500" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Editar nome, descrição ou excluir a campanha.</p>
                                    <div className="mt-4">
                                        <Button variant="outline" className="w-full" disabled>Em breve</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
