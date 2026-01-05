import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { Loader2, Shield, AlertTriangle, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
    id: string;
    name: string;
    description: string;
    system: string;
}

interface Character {
    id: string;
    name: string;
    race: string;
    class: string;
    level: number;
    campaignId?: string;
}

export default function Invite() {
    const params = useParams();
    const campaignId = params.id || "";
    const { user, isLoading: authLoading } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [joiningCharId, setJoiningCharId] = useState<string | null>(null);

    useEffect(() => {
        // Redirect if not logged in
        if (!authLoading && !user) {
            // Save return url? For now just go to auth
            setLocation("/auth");
            return;
        }

        const fetchData = async () => {
            if (!user || !campaignId) return;

            try {
                // 1. Fetch Campaign Info
                const campRef = doc(db, "campaigns", campaignId);
                const campSnap = await getDoc(campRef);

                if (!campSnap.exists()) {
                    toast({ title: "Campanha inválida ou inexistente", variant: "destructive" });
                    setLocation("/");
                    return;
                }
                setCampaign({ id: campSnap.id, ...campSnap.data() } as Campaign);

                // 2. Fetch User Characters
                const q = query(collection(db, "characters"), where("userId", "==", user.id));
                const querySnapshot = await getDocs(q);
                const chars: Character[] = [];
                querySnapshot.forEach((doc) => {
                    chars.push({ id: doc.id, ...doc.data() } as Character);
                });
                setCharacters(chars);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ title: "Erro ao carregar dados", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user, campaignId, authLoading]);

    const handleJoin = async (charId: string) => {
        if (!campaign) return;
        setJoiningCharId(charId);
        try {
            const charRef = doc(db, "characters", charId);
            await updateDoc(charRef, {
                campaignId: campaign.id
            });
            toast({ title: `Você entrou em "${campaign.name}"!` });
            setLocation("/profile");
        } catch (error) {
            console.error("Error joining campaign:", error);
            toast({ title: "Erro ao entrar na campanha", variant: "destructive" });
            setJoiningCharId(null);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-accent w-12 h-12" />
            </div>
        );
    }

    if (!campaign) return null; // Should have redirected

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden animate-in fade-in duration-700">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <Card className="w-full max-w-2xl border-accent/30 bg-card/60 backdrop-blur-md relative z-10">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-cinzel text-accent">Convite de Aventura</CardTitle>
                    <CardDescription className="text-lg font-lora text-slate-300">
                        Você foi convocado para se juntar a <span className="text-white font-bold">"{campaign.name}"</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-background/50 border border-accent/10 text-center">
                        <p className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Sistema</p>
                        <p className="font-cinzel text-xl text-foreground">{campaign.system}</p>
                        <p className="text-sm mt-4 italic font-lora text-slate-400">"{campaign.description}"</p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-center font-cinzel text-lg text-white">Escolha seu Herói</h3>

                        {characters.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-muted-foreground mb-4">Você ainda não possui personagens.</p>
                                <Button onClick={() => setLocation("/characters/new")} className="bg-accent text-accent-foreground">
                                    Criar Novo Personagem
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 max-h-[300px] overflow-y-auto pr-2">
                                {characters.map(char => (
                                    <div
                                        key={char.id}
                                        className={`p-4 rounded-lg border flex items-center justify-between transition-all ${char.campaignId === campaign.id
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-card/40 border-accent/10 hover:border-accent/40"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded bg-slate-900 flex items-center justify-center text-accent font-cinzel font-bold border border-accent/20">
                                                {char.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">{char.name}</p>
                                                <p className="text-xs text-muted-foreground">{char.race} {char.class} - Nível {char.level}</p>
                                            </div>
                                        </div>

                                        {char.campaignId === campaign.id ? (
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-green-500 text-xs font-bold flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> Já no grupo
                                                </span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setLocation(`/session/${campaign.id}`)}
                                                    className="bg-red-900/80 text-white hover:bg-red-800 border-red-500/30 border gap-2 font-bold shadow-sm font-cinzel text-xs h-8 animate-pulse"
                                                >
                                                    <Sword className="w-3 h-3" /> Entrar na Sala
                                                </Button>
                                            </div>
                                        ) : char.campaignId ? (
                                            <span className="text-yellow-500 text-sm flex items-center gap-2" title="Este personagem já está em outra campanha">
                                                <AlertTriangle className="w-4 h-4" /> Ocupado
                                            </span>
                                        ) : (
                                            <Button
                                                onClick={() => handleJoin(char.id)}
                                                disabled={!!joiningCharId}
                                                className="bg-accent text-accent-foreground hover:bg-accent/90"
                                            >
                                                {joiningCharId === char.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar com este"}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
