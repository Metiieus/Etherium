import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, Shield, Heart, Zap, Backpack, Skull, Edit, Save, Camera, Upload, Trophy, Swords, Crown, MessageSquare, ThumbsUp, Share2, MoreVertical, Image as ImageIcon, Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Model3DViewer } from "@/components/Model3DViewer";
import { useAuth } from "@/_core/hooks/useAuth";

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
    appearance: string;
    personality: string;
    avatarUrl?: string;
    model3dUrl?: string;
    inventory?: any[];
    achievements?: any[];
}

interface Post {
    id: string;
    text: string;
    author: string;
    timestamp: any;
    likes: number;
    type: 'achievement' | 'story' | 'loot';
}

export default function CharacterSheet() {
    const params = useParams();
    const characterId = params.id || "";
    const { toast } = useToast();
    const { user } = useAuth();
    const [character, setCharacter] = useState<Character | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPost, setNewPost] = useState("");
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isUploading3D, setIsUploading3D] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const model3DInputRef = useRef<HTMLInputElement>(null);

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

        // Subscribe to posts
        if (characterId) {
            const postsRef = collection(db, "characters", characterId, "posts");
            const q = query(postsRef, orderBy("timestamp", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                setPosts(postsData);
            });
            return () => unsubscribe();
        }
    }, [characterId]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !character) return;

        setIsUploadingAvatar(true);
        try {
            const storageRef = ref(storage, `characters/${characterId}/avatar_${Date.now()}.${file.name.split('.').pop()}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await updateDoc(doc(db, "characters", characterId), { avatarUrl: downloadURL });
            setCharacter({ ...character, avatarUrl: downloadURL });
            toast({ title: "Foto atualizada!", description: "Seu personagem está ainda mais épico!" });
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast({ title: "Erro ao fazer upload", variant: "destructive" });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleModel3DUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !character) return;

        // Validate file type
        const validTypes = ['.glb', '.gltf'];
        const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!validTypes.includes(fileExt)) {
            toast({ title: "Formato inválido", description: "Use arquivos .glb ou .gltf", variant: "destructive" });
            return;
        }

        setIsUploading3D(true);
        try {
            const storageRef = ref(storage, `characters/${characterId}/model3d_${Date.now()}${fileExt}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await updateDoc(doc(db, "characters", characterId), { model3dUrl: downloadURL });
            setCharacter({ ...character, model3dUrl: downloadURL });
            toast({ title: "Modelo 3D carregado!", description: "Seu personagem ganhou vida!" });
        } catch (error) {
            console.error("Error uploading 3D model:", error);
            toast({ title: "Erro ao fazer upload", variant: "destructive" });
        } finally {
            setIsUploading3D(false);
        }
    };

    const handleAddPost = async () => {
        if (!newPost.trim() || !characterId) return;

        try {
            await addDoc(collection(db, "characters", characterId, "posts"), {
                text: newPost,
                author: character?.name || "Herói",
                timestamp: new Date(),
                likes: 0,
                type: 'story'
            });
            setNewPost("");
            toast({ title: "História publicada!" });
        } catch (error) {
            console.error("Error adding post:", error);
        }
    };

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

    const getMod = (score: number) => Math.floor((score - 10) / 2);
    const fmtMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

    const isOwner = user?.id === character.userId;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground pb-20">
            {/* Hidden File Inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <input ref={model3DInputRef} type="file" accept=".glb,.gltf" className="hidden" onChange={handleModel3DUpload} />

            {/* Hero Cover */}
            <div className="relative h-80 overflow-hidden border-b border-accent/20">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 blur-sm" 
                    style={{ backgroundImage: `url(${character.avatarUrl || 'https://images.unsplash.com/photo-1533109721025-d1ae7ee7c1e1?q=80&w=2670&auto=format&fit=crop'})` }}
                />
                
                {/* Character Info Overlay */}
                <div className="container relative z-20 h-full flex items-end pb-8">
                    <div className="flex items-end gap-6 w-full">
                        {/* Avatar */}
                        <div className="relative group">
                            <Avatar className="w-40 h-40 border-4 border-accent/50 shadow-2xl ring-4 ring-black/50">
                                <AvatarImage src={character.avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-gradient-to-br from-slate-700 to-slate-900">
                                    {character.name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            {isOwner && (
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                >
                                    {isUploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                </Button>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 mb-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-5xl font-cinzel font-bold text-white drop-shadow-lg flex items-center gap-3">
                                        {character.name}
                                        <Badge className="bg-accent text-black font-bold text-lg">Nv {character.level}</Badge>
                                    </h1>
                                    <div className="flex items-center gap-3 text-lg text-slate-300 font-lora mt-2">
                                        <span>{character.race} {character.class}</span>
                                        <span className="text-accent">•</span>
                                        <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> {character.experience || 0} XP</span>
                                    </div>
                                </div>

                                {isOwner && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={openEdit} className="border-accent/30 text-accent hover:bg-accent/10">
                                            <Edit className="w-4 h-4 mr-2" /> Editar
                                        </Button>
                                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <Skull className="w-4 h-4 mr-2" /> Excluir
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-card border-accent/20">
                                                <DialogHeader>
                                                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                                                    <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                                                    <Button variant="destructive" onClick={handleDelete}>Excluir Permanentemente</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mt-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Sidebar - Stats & 3D Model */}
                    <div className="space-y-6">
                        {/* 3D Model Viewer */}
                        <Card className="border-accent/30 bg-card/60 backdrop-blur-md overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="font-cinzel text-accent flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Box className="w-5 h-5" /> Modelo 3D</span>
                                    {isOwner && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-accent/30"
                                            onClick={() => model3DInputRef.current?.click()}
                                            disabled={isUploading3D}
                                        >
                                            {isUploading3D ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                            Upload
                                        </Button>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-80">
                                    <Model3DViewer modelUrl={character.model3dUrl} className="h-full border-none" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Vitals */}
                        <Card className="border-accent/30 bg-card/60 backdrop-blur-md">
                            <CardHeader><CardTitle className="font-cinzel text-accent">Status Vital</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-2">
                                        <Shield className="w-8 h-8 text-slate-400 mx-auto" />
                                        <div className="text-3xl font-bold font-cinzel">{character.armorClass}</div>
                                        <span className="text-xs text-muted-foreground uppercase">CA</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Heart className="w-8 h-8 text-red-500 mx-auto" />
                                        <div className="text-3xl font-bold font-cinzel">
                                            {character.currentHp} <span className="text-sm text-muted-foreground">/ {character.maxHp}</span>
                                        </div>
                                        <Progress value={(character.currentHp / character.maxHp) * 100} className="h-2 bg-red-900" indicatorClassName="bg-red-500" />
                                        <span className="text-xs text-muted-foreground uppercase">PV</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Zap className="w-8 h-8 text-yellow-500 mx-auto" />
                                        <div className="text-3xl font-bold font-cinzel">{fmtMod(getMod(character.dexterity))}</div>
                                        <span className="text-xs text-muted-foreground uppercase">Iniciativa</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Attributes */}
                        <Card className="border-accent/30 bg-card/60 backdrop-blur-md">
                            <CardHeader><CardTitle className="font-cinzel text-accent">Atributos</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "FOR", val: character.strength, icon: "💪" },
                                        { label: "DES", val: character.dexterity, icon: "🏃" },
                                        { label: "CON", val: character.constitution, icon: "❤️" },
                                        { label: "INT", val: character.intelligence, icon: "🧠" },
                                        { label: "SAB", val: character.wisdom, icon: "🦉" },
                                        { label: "CAR", val: character.charisma, icon: "✨" },
                                    ].map(stat => (
                                        <div key={stat.label} className="bg-black/20 rounded-lg p-3 text-center space-y-1">
                                            <div className="text-2xl">{stat.icon}</div>
                                            <div className="text-sm font-bold text-muted-foreground">{stat.label}</div>
                                            <div className="text-2xl font-cinzel text-white">{stat.val}</div>
                                            <Badge variant="outline" className="border-accent/30 text-accent">
                                                {fmtMod(getMod(stat.val))}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Center - Feed & Stories */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Create Post */}
                        {isOwner && (
                            <Card className="border-accent/30 bg-card/60 backdrop-blur-md">
                                <CardContent className="p-4">
                                    <div className="flex gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={character.avatarUrl} />
                                            <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-3">
                                            <Textarea
                                                placeholder="Compartilhe uma história épica, conquista ou momento memorável..."
                                                value={newPost}
                                                onChange={(e) => setNewPost(e.target.value)}
                                                className="bg-background/50 border-accent/20 min-h-[80px]"
                                            />
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" className="border-accent/20">
                                                        <ImageIcon className="w-4 h-4 mr-2" /> Foto
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="border-accent/20">
                                                        <Trophy className="w-4 h-4 mr-2" /> Conquista
                                                    </Button>
                                                </div>
                                                <Button size="sm" onClick={handleAddPost} className="bg-accent text-black hover:bg-yellow-500 font-bold">
                                                    Publicar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Posts Feed */}
                        <div className="space-y-4">
                            {posts.map(post => (
                                <Card key={post.id} className="border-accent/30 bg-card/60 backdrop-blur-md hover:border-accent/50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={character.avatarUrl} />
                                                <AvatarFallback>{character.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-bold text-white">{post.author}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {post.timestamp?.toDate?.()?.toLocaleDateString('pt-BR') || 'Agora'}
                                                        </p>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <p className="mt-3 text-slate-200 font-lora leading-relaxed">{post.text}</p>
                                                
                                                <Separator className="my-3" />
                                                
                                                <div className="flex items-center gap-4">
                                                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-accent">
                                                        <ThumbsUp className="w-4 h-4 mr-2" /> {post.likes || 0}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-accent">
                                                        <MessageSquare className="w-4 h-4 mr-2" /> Comentar
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-accent">
                                                        <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {posts.length === 0 && (
                                <Card className="border-accent/30 bg-card/60 backdrop-blur-md">
                                    <CardContent className="p-12 text-center">
                                        <Swords className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                                        <p className="text-muted-foreground font-lora">Nenhuma história publicada ainda.</p>
                                        <p className="text-sm text-muted-foreground/70 mt-2">Compartilhe suas aventuras épicas!</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Tabs - Inventory, Bio, etc */}
                        <Tabs defaultValue="inventory" className="w-full">
                            <TabsList className="bg-background/50 border border-accent/20 w-full justify-start">
                                <TabsTrigger value="inventory" className="data-[state=active]:bg-accent data-[state=active]:text-background">
                                    <Backpack className="w-4 h-4 mr-2" /> Inventário
                                </TabsTrigger>
                                <TabsTrigger value="bio" className="data-[state=active]:bg-accent data-[state=active]:text-background">
                                    Biografia
                                </TabsTrigger>
                                <TabsTrigger value="achievements" className="data-[state=active]:bg-accent data-[state=active]:text-background">
                                    <Trophy className="w-4 h-4 mr-2" /> Conquistas
                                </TabsTrigger>
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
                                        {character.inventory.map((item: any, index: number) => (
                                            <Card key={index} className="bg-card/40 border-accent/20 overflow-hidden group hover:border-accent/50 transition-all">
                                                {item.imageUrl && (
                                                    <div className="aspect-[3/4] overflow-hidden">
                                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                    </div>
                                                )}
                                                <CardContent className="p-3">
                                                    <p className="font-bold text-sm text-center">{item.name}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="bio" className="mt-4">
                                <Card className="bg-card/40 border-accent/20">
                                    <CardContent className="p-6 space-y-4">
                                        <div>
                                            <h4 className="font-bold text-accent mb-2">História</h4>
                                            <p className="text-slate-300 font-lora leading-relaxed">{character.backstory || "Nenhuma história registrada."}</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <h4 className="font-bold text-accent mb-2">Aparência</h4>
                                            <p className="text-slate-300 font-lora leading-relaxed">{character.appearance || "Nenhuma descrição."}</p>
                                        </div>
                                        <Separator />
                                        <div>
                                            <h4 className="font-bold text-accent mb-2">Personalidade</h4>
                                            <p className="text-slate-300 font-lora leading-relaxed">{character.personality || "Nenhuma descrição."}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="achievements" className="mt-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { icon: "🏆", title: "Primeiro Sangue", desc: "Derrote seu primeiro inimigo", unlocked: true },
                                        { icon: "⚔️", title: "Guerreiro", desc: "Alcance nível 5", unlocked: character.level >= 5 },
                                        { icon: "👑", title: "Lenda", desc: "Alcance nível 10", unlocked: character.level >= 10 },
                                        { icon: "💎", title: "Colecionador", desc: "Tenha 10 itens", unlocked: (character.inventory?.length || 0) >= 10 },
                                    ].map((achievement, index) => (
                                        <Card key={index} className={`bg-card/40 border-accent/20 p-4 text-center ${achievement.unlocked ? '' : 'opacity-50 grayscale'}`}>
                                            <div className="text-4xl mb-2">{achievement.icon}</div>
                                            <p className="font-bold text-sm">{achievement.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
                                            {achievement.unlocked && <Badge className="mt-2 bg-accent text-black">Desbloqueado</Badge>}
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-card border-accent/20">
                    <DialogHeader>
                        <DialogTitle className="font-cinzel text-accent">Editar Personagem</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Nome</Label>
                            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-background/50 border-accent/20" />
                        </div>
                        <div>
                            <Label>História</Label>
                            <Textarea value={editForm.backstory} onChange={(e) => setEditForm({ ...editForm, backstory: e.target.value })} className="bg-background/50 border-accent/20 min-h-[120px]" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleEditSave} className="bg-accent text-black hover:bg-yellow-500 font-bold">
                            <Save className="w-4 h-4 mr-2" /> Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
