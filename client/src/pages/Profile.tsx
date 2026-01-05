import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Trophy, Crown, Plus, User, Heart } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Character {
    id: string;
    name: string;
    race: string;
    class: string;
    level: number;
    armorClass: number;
    currentHp: number;
    maxHp: number;
}

export default function Profile() {
    const { user, logout, updatePhoto } = useAuth();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
    const [newPhotoUrl, setNewPhotoUrl] = useState("");

    const { toast } = useToast();

    useEffect(() => {
        if (user?.name) {
            setTimeout(() => {
                toast({
                    title: `Saudações, ${user.name}!`,
                    description: "O reino aguarda seus comandos.",
                    className: "bg-accent/10 border-accent/20 text-foreground"
                });
            }, 500);
        }
    }, [user]);

    useEffect(() => {
        async function fetchCharacters() {
            if (!user) return;
            try {
                const q = query(collection(db, "characters"), where("userId", "==", user.id));
                const querySnapshot = await getDocs(q);
                const chars: Character[] = [];
                querySnapshot.forEach((doc) => {
                    chars.push({ id: doc.id, ...doc.data() } as Character);
                });
                setCharacters(chars);
            } catch (error: any) {
                console.error("Error fetching characters:", error);
                // Don't show toast for permission error to avoid spamming if rules are wrong
                if (error.code !== 'permission-denied') {
                    toast({ title: "Erro ao carregar heróis", variant: "destructive" });
                }
            } finally {
                setIsLoading(false);
            }
        }

        fetchCharacters();
    }, [user]);

    return (
        <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-700">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-accent/5 rounded-full blur-[120px] animate-pulse duration-[10000ms]" />
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[100px] animate-pulse duration-[7000ms]" />
            </div>

            <div className="container relative z-10 py-8">
                {/* Header / Nav */}
                <div className="flex justify-between items-center mb-12 border-b border-border/50 pb-6">
                    <Link href="/">
                        <Button variant="ghost" className="text-muted-foreground hover:text-accent font-cinzel">
                            ← Voltar ao Reino
                        </Button>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/characters/new">
                            <Button className="bg-accent text-background hover:bg-accent/90 font-bold border-none shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                                <Plus className="w-4 h-4 mr-2" /> Forjar Novo Herói
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={() => logout()} className="text-muted-foreground border-accent/20 hover:text-accent">
                            Sair
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column: Player Card */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-accent/30 bg-card/60 backdrop-blur-md overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent opacity-50" />
                            <CardContent className="pt-8 relative flex flex-col items-center text-center space-y-4">
                                {/* Avatar with Ring */}
                                <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div className="relative cursor-pointer group/avatar">
                                            <div className="w-32 h-32 rounded-full border-2 border-accent/50 p-1 relative z-10 bg-background/50 backdrop-blur-sm group-hover/avatar:border-accent transition-colors">
                                                <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center overflow-hidden relative">
                                                    {user?.image || user?.openId ? (
                                                        <img
                                                            src={user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
                                                            alt="Avatar"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Crown className="w-12 h-12 text-accent" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                                        <Plus className="w-8 h-8 text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Glowing Effect */}
                                            <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse group-hover/avatar:bg-accent/40" />
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="bg-card border-accent/20">
                                        <DialogHeader>
                                            <DialogTitle className="font-cinzel text-accent">Alterar Retrato</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>URL da Imagem</Label>
                                                <Input
                                                    placeholder="https://..."
                                                    value={newPhotoUrl}
                                                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                                                    className="bg-background/50 border-accent/20"
                                                />
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    updatePhoto(newPhotoUrl);
                                                    setIsPhotoDialogOpen(false);
                                                }}
                                                className="w-full bg-accent text-background hover:bg-accent/90 font-bold"
                                            >
                                                Salvar Novo Retrato
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                <div className="space-y-1">
                                    <h2 className="text-2xl font-cinzel font-bold text-foreground">{user?.name || "Herói Desconhecido"}</h2>
                                    <p className="text-muted-foreground text-sm font-lora">Membro desde 2026</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-border/50 bg-card/40 backdrop-blur-sm p-4 flex flex-col items-center justify-center space-y-2">
                                <User className="w-6 h-6 text-accent" />
                                <span className="text-2xl font-bold font-cinzel">{characters?.length || 0}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Heróis</span>
                            </Card>
                            <Card className="border-border/50 bg-card/40 backdrop-blur-sm p-4 flex flex-col items-center justify-center space-y-2">
                                <Trophy className="w-6 h-6 text-yellow-500" />
                                <span className="text-2xl font-bold font-cinzel">0</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Vitórias</span>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Character List */}
                    <div className="lg:col-span-8 space-y-6">

                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-cinzel font-bold text-white">Seus Heróis</h3>
                        </div>

                        {isLoading ? (
                            <div className="text-accent animate-pulse">Carregando Grimório...</div>
                        ) : characters && characters.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-6">
                                {characters.map((char, index) => (
                                    <Link key={char.id} href={`/characters/${char.id}`}>
                                        <div
                                            className="cursor-pointer block animate-in slide-in-from-bottom-4 fade-in duration-500"
                                            style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'backwards' }}
                                        >
                                            <Card className="border-border/50 bg-card/40 backdrop-blur-sm hover:border-accent/50 hover:bg-card/60 transition-all group">
                                                <CardContent className="p-6 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                    <div className="relative z-10 flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-xl font-cinzel font-bold text-foreground group-hover:text-accent transition-colors">{char.name}</h4>
                                                            <p className="text-sm text-muted-foreground font-lora">{char.race} {char.class}</p>
                                                        </div>
                                                        <Badge variant="outline" className="border-accent/30 text-accent">Nvl {char.level}</Badge>
                                                    </div>

                                                    <div className="mt-6 flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Shield className="w-4 h-4" /> <span>CA {char.armorClass}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Heart className="w-4 h-4" /> <span>PV {char.currentHp}/{char.maxHp}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-card/20">
                                <p className="text-muted-foreground font-lora mb-4">Nenhum herói encontrado nos arquivos.</p>
                                <Link href="/characters/new">
                                    <Button variant="outline" className="border-accent/30 text-accent hover:bg-accent/10">
                                        Crie Seu Primeiro Personagem
                                    </Button>
                                </Link>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
