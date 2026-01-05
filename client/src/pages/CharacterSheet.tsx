import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Loader2, Shield, Heart, Zap, Backpack, Skull, Edit, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Character {
    id: string;
    name: string;
    race: string;
    class: string;
    level: number;
    armorClass: number;
    currentHp: number;
    maxHp: number;
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    experience: number;
    backstory: string;
    inventory?: any[]; // Using any for flexibility with legacy items vs cards
}

export default function CharacterSheet() {
    const params = useParams();
    const characterId = params.id || "";
    const { toast } = useToast();
    const [character, setCharacter] = useState<Character | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCharacter() {
            if (!characterId) return;
            try {
                const docRef = doc(db, "characters", characterId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCharacter({ id: docSnap.id, ...docSnap.data() } as Character);
                } else {
                    console.error("No such document!");
                }
            } catch (e) {
                console.error("Error getting character:", e);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCharacter();
    }, [characterId]);

    const updateHealth = async (newHp: number) => {
        if (!character) return;
        try {
            const charRef = doc(db, "characters", character.id);
            await updateDoc(charRef, { currentHp: newHp });
            setCharacter({ ...character, currentHp: newHp });
            toast({ title: "Vida Atualizada" });
        } catch (e) {
            console.error("Error updating hp", e);
            toast({ title: "Erro ao atualizar vida", variant: "destructive" });
        }
    };

    const [, setLocation] = useLocation();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", backstory: "" });

    const handleDelete = async () => {
        if (!character) return;
        try {
            await deleteDoc(doc(db, "characters", character.id));
            toast({ title: "Personagem excluído." });
            setLocation("/profile");
        } catch (error) {
            console.error("Error deleting:", error);
            toast({ title: "Erro ao excluir", variant: "destructive" });
        }
    };

    const handleEditSave = async () => {
        if (!character) return;
        try {
            const charRef = doc(db, "characters", character.id);
            await updateDoc(charRef, {
                name: editForm.name,
                backstory: editForm.backstory
            });
            setCharacter({ ...character, name: editForm.name, backstory: editForm.backstory });
            setIsEditDialogOpen(false);
            toast({ title: "Personagem atualizado!" });
        } catch (error) {
            console.error("Error updating:", error);
            toast({ title: "Erro ao atualizar", variant: "destructive" });
        }
    };

    // Open edit modal with current values
    const openEdit = () => {
        if (!character) return;
        setEditForm({ name: character.name, backstory: character.backstory });
        setIsEditDialogOpen(true);
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-accent"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    if (!character) {
        return <div className="min-h-screen flex items-center justify-center text-destructive">Personagem não encontrado</div>;
    }

    // Calculate Modifiers
    const getMod = (score: number) => Math.floor((score - 10) / 2);
    const fmtMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Hero Header */}
            <div className="relative h-64 overflow-hidden border-b border-accent/20">
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533109721025-d1ae7ee7c1e1?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-30" />

                <div className="container relative z-20 h-full flex items-end pb-8">
                    <div className="flex items-end gap-6">
                        <div className="w-32 h-32 rounded-lg border-2 border-accent/50 overflow-hidden bg-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            {/* Placeholder Avatar */}
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <span className="text-4xl text-accent font-cinzel">{character.name.charAt(0)}</span>
                            </div>
                        </div>
                        <div className="mb-2">
                            <h1 className="text-4xl font-cinzel font-bold text-white drop-shadow-md">{character.name}</h1>
                            <div className="flex items-center gap-2 text-lg text-slate-300 font-lora">
                                <span>Nível {character.level}</span>
                                <span className="text-accent">•</span>
                                <span>{character.race} {character.class}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mt-8 grid lg:grid-cols-3 gap-8">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Vitals */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Shield className="w-8 h-8 text-slate-400 mb-2" />
                                <div className="text-3xl font-bold font-cinzel">{character.armorClass}</div>
                                <span className="text-xs text-muted-foreground uppercase">Classe de Armadura</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center relative group">
                                <Heart className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform cursor-pointer"
                                    onClick={() => updateHealth(Math.max(0, character.currentHp - 1))}
                                />
                                <div className="text-3xl font-bold font-cinzel">
                                    {character.currentHp} <span className="text-sm text-muted-foreground font-lora">/ {character.maxHp}</span>
                                </div>
                                <Progress value={(character.currentHp / character.maxHp) * 100} className="w-full h-1 mt-2 bg-red-900" indicatorClassName="bg-red-500" />
                                <span className="text-xs text-muted-foreground uppercase mt-1">Pontos de Vida</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Zap className="w-8 h-8 text-yellow-500 mb-2" />
                                <div className="text-3xl font-bold font-cinzel">{fmtMod(getMod(character.dexterity))}</div>
                                <span className="text-xs text-muted-foreground uppercase">Iniciativa</span>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Attributes */}
                    <Card className="bg-card/40 border-accent/20 backdrop-blur-sm">
                        <CardHeader><CardTitle className="font-cinzel text-accent">Atributos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                                {[
                                    { label: "FOR", val: character.strength },
                                    { label: "DES", val: character.dexterity },
                                    { label: "CON", val: character.constitution },
                                    { label: "INT", val: character.intelligence },
                                    { label: "SAB", val: character.wisdom },
                                    { label: "CAR", val: character.charisma },
                                ].map(stat => (
                                    <div key={stat.label} className="space-y-1">
                                        <div className="text-sm font-bold text-muted-foreground">{stat.label}</div>
                                        <div className="text-2xl font-cinzel text-white">{stat.val}</div>
                                        <Badge variant="outline" className="border-accent/30 text-accent mx-auto block w-fit">
                                            {fmtMod(getMod(stat.val))}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs for Inv, Spells, Bio */}
                    <Tabs defaultValue="inventory" className="w-full">
                        <TabsList className="bg-background/50 border border-accent/20 w-full justify-start">
                            <TabsTrigger value="inventory" className="data-[state=active]:bg-accent data-[state=active]:text-background">Inventário</TabsTrigger>
                            <TabsTrigger value="bio" className="data-[state=active]:bg-accent data-[state=active]:text-background">Biografia</TabsTrigger>
                        </TabsList>
                        <TabsContent value="inventory" className="mt-4">
                            {!character.inventory || character.inventory.length === 0 ? (
                                <Card className="bg-card/40 border-accent/10">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-center h-32 text-muted-foreground border-2 border-dashed border-accent/10 rounded-lg">
                                            <Backpack className="w-6 h-6 mr-2 opacity-50" /> Inventário Vazio
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {character.inventory.map((item: any, idx: number) => (
                                        item.type === 'card' ? (
                                            <Dialog key={idx}>
                                                <DialogTrigger>
                                                    <div className="rounded-lg overflow-hidden border border-accent/20 bg-black relative group cursor-pointer hover:scale-105 transition-transform">
                                                        <div className="aspect-[2/3] relative">
                                                            <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                        </div>
                                                        <div className="p-2 bg-card/80 backdrop-blur-sm absolute bottom-0 left-0 right-0">
                                                            <p className="text-xs font-cinzel text-center truncate text-accent-foreground">{item.name}</p>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="bg-transparent border-none shadow-none max-w-lg p-0 overflow-hidden">
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-auto rounded-xl shadow-2xl border-2 border-accent/50" />
                                                </DialogContent>
                                            </Dialog>
                                        ) : (
                                            <Card key={idx} className="bg-card/40 border-accent/20">
                                                <CardContent className="p-4">
                                                    <p className="font-bold">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.desc || "Item comum"}</p>
                                                </CardContent>
                                            </Card>
                                        )
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="bio" className="mt-4">
                            <Card className="bg-card/40 border-accent/10">
                                <CardContent className="p-6">
                                    <p className="font-lora leading-relaxed text-slate-300">
                                        {character.backstory || "Nenhuma história escrita ainda."}
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="bg-card/40 border-accent/20">
                        <CardHeader><CardTitle className="font-cinzel text-sm uppercase tracking-widest text-muted-foreground">Progressão</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Experiência</span>
                                    <span>{character.experience} XP</span>
                                </div>
                                <Progress value={(character.experience % 1000) / 10} className="h-2 bg-slate-800" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/40 border-accent/20">
                        <CardHeader><CardTitle className="font-cinzel text-sm uppercase tracking-widest text-muted-foreground">Ações</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" onClick={openEdit} className="w-full border-accent/20 hover:bg-accent/10 hover:text-accent justify-start">
                                        <Edit className="w-4 h-4 mr-2" /> Editar Personagem
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-accent/20">
                                    <DialogHeader>
                                        <DialogTitle className="font-cinzel text-accent">Editar Detalhes</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nome</Label>
                                            <Input
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                className="bg-background/50 border-accent/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Biografia</Label>
                                            <Textarea
                                                value={editForm.backstory}
                                                onChange={e => setEditForm({ ...editForm, backstory: e.target.value })}
                                                className="bg-background/50 border-accent/20 min-h-[150px]"
                                            />
                                        </div>
                                        <Button onClick={handleEditSave} className="w-full bg-accent text-background hover:bg-accent/90">
                                            <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full justify-start">
                                        <Skull className="w-4 h-4 mr-2" /> Excluir Personagem
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-destructive/20">
                                    <DialogHeader>
                                        <DialogTitle className="font-cinzel text-destructive">Morte Definitiva</DialogTitle>
                                        <DialogDescription className="text-muted-foreground">
                                            Tem certeza que deseja apagar {character.name} da existência? Essa ação é irreversível.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                                        <Button variant="destructive" onClick={handleDelete}>Confirmar Exclusão</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
