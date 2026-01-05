import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft, Sword, Scroll, User, Loader2 } from "lucide-react";

export default function CharacterCreate() {
    const [step, setStep] = useState(1);
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        race: "",
        class: "",
        strength: 8,
        dexterity: 8,
        constitution: 8,
        intelligence: 8,
        wisdom: 8,
        charisma: 8,
        backstory: "",
    });

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        if (!user) {
            toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // Calculate basic stats
            const hp = 10 + Math.floor((formData.constitution - 10) / 2); // Base 10 + Con Mod
            const ac = 10 + Math.floor((formData.dexterity - 10) / 2); // Base 10 + Dex Mod

            await addDoc(collection(db, "characters"), {
                ...formData,
                userId: user.id,
                maxHp: hp,
                currentHp: hp,
                armorClass: ac,
                level: 1,
                experience: 0,
                gold: 0,
                createdAt: new Date()
            });

            toast({
                title: "Personagem Criado",
                description: "Seu herói foi forjado com sucesso!",
            });
            setLocation("/profile");

        } catch (error: any) {
            console.error("Error creating character:", error);
            toast({
                title: "Erro ao criar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const translations: Record<string, string> = {
        strength: "Força",
        dexterity: "Destreza",
        constitution: "Constituição",
        intelligence: "Inteligência",
        wisdom: "Sabedoria",
        charisma: "Carisma"
    };

    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="container max-w-2xl relative z-10 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-cinzel font-bold text-accent drop-shadow-sm">Forje Seu Herói</h1>
                    <p className="text-muted-foreground font-lora">Passo {step} de 3</p>
                </div>

                {/* Steps Indicator */}
                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`h-2 w-12 rounded-full transition-all ${step >= i ? "bg-accent" : "bg-muted"}`}
                        />
                    ))}
                </div>

                <Card className="border-accent/30 bg-card/60 backdrop-blur-md">
                    <CardContent className="p-8 space-y-6">

                        {/* Step 1: Identity */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="flex items-center gap-3 text-2xl font-cinzel font-bold text-foreground border-b border-border/50 pb-2">
                                    <User className="w-6 h-6 text-accent" />
                                    <h2>Identidade</h2>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Nome do Personagem</Label>
                                    <Input
                                        placeholder="ex: Valerius, o Bravo"
                                        className="bg-background/50 border-accent/20 focus:border-accent"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Raça</Label>
                                        <Select onValueChange={(val) => setFormData({ ...formData, race: val })} value={formData.race}>
                                            <SelectTrigger className="bg-background/50 border-accent/20 text-foreground">
                                                <SelectValue placeholder="Selecione a Raça" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Humano">Humano</SelectItem>
                                                <SelectItem value="Elfo">Elfo</SelectItem>
                                                <SelectItem value="Anão">Anão</SelectItem>
                                                <SelectItem value="Orc">Orc</SelectItem>
                                                <SelectItem value="Tiefling">Tiefling</SelectItem>
                                                <SelectItem value="Draconato">Draconato</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Classe</Label>
                                        <Select onValueChange={(val) => setFormData({ ...formData, class: val })} value={formData.class}>
                                            <SelectTrigger className="bg-background/50 border-accent/20 text-foreground">
                                                <SelectValue placeholder="Selecione a Classe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Guerreiro">Guerreiro</SelectItem>
                                                <SelectItem value="Mago">Mago</SelectItem>
                                                <SelectItem value="Ladino">Ladino</SelectItem>
                                                <SelectItem value="Clérigo">Clérigo</SelectItem>
                                                <SelectItem value="Paladino">Paladino</SelectItem>
                                                <SelectItem value="Bárbaro">Bárbaro</SelectItem>
                                                <SelectItem value="Bardo">Bardo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Attributes */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="flex items-center gap-3 text-2xl font-cinzel font-bold text-foreground border-b border-border/50 pb-2">
                                    <Sword className="w-6 h-6 text-accent" />
                                    <h2>Atributos</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-black/20 p-4 rounded border border-accent/20 flex justify-between items-center">
                                        <span className="text-muted-foreground font-lora">Pontos Disponíveis:</span>
                                        <span className={`text-2xl font-cinzel font-bold ${27 - (Object.keys(translations).reduce((acc, key) => {
                                            const val = formData[key as keyof typeof formData] as number;
                                            return acc + (val - 8 + (val > 13 ? (val - 13) : 0) + (val > 14 ? 1 : 0));
                                        }, 0)) >= 0 ? 'text-accent' : 'text-red-500'}`}>
                                            {27 - (Object.keys(translations).reduce((acc, key) => {
                                                const val = formData[key as keyof typeof formData] as number;
                                                // Simplified cost logic relative to base 8:
                                                // 8->0, 9->1, 10->2, 11->3, 12->4, 13->5, 14->7 (+2), 15->9 (+2)
                                                // Formula approximation or Map lookup is better, but doing inline loop for now:
                                                let cost = 0;
                                                for (let i = 9; i <= val; i++) {
                                                    cost += (i >= 14 ? 2 : 1);
                                                }
                                                return acc + cost;
                                            }, 0))}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">Distribua 27 pontos. Atributos começam em 8 e vão até 15.</p>

                                    {["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map((attr) => {
                                        const key = attr as keyof typeof formData;
                                        const value = formData[key] as number;
                                        const currentPoints = 27 - (Object.keys(translations).reduce((acc, k) => {
                                            const v = formData[k as keyof typeof formData] as number;
                                            let c = 0;
                                            for (let i = 9; i <= v; i++) c += (i >= 14 ? 2 : 1);
                                            return acc + c;
                                        }, 0));

                                        const costNext = value >= 13 ? 2 : 1;
                                        const canIncrease = value < 15 && currentPoints >= costNext;
                                        const canDecrease = value > 8;

                                        return (
                                            <div key={attr} className="flex items-center justify-between bg-black/10 p-2 rounded">
                                                <Label className="text-foreground w-1/3">{translations[attr]}</Label>
                                                <div className="flex items-center gap-4">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={!canDecrease}
                                                        onClick={() => setFormData({ ...formData, [key]: value - 1 })}
                                                    >
                                                        -
                                                    </Button>
                                                    <span className="text-xl font-cinzel font-bold w-8 text-center">{value}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={!canIncrease}
                                                        onClick={() => setFormData({ ...formData, [key]: value + 1 })}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                                <div className="w-12 text-right text-xs text-muted-foreground font-mono">
                                                    {Math.floor((value - 10) / 2) >= 0 ? '+' : ''}{Math.floor((value - 10) / 2)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Backstory & Review */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="flex items-center gap-3 text-2xl font-cinzel font-bold text-foreground border-b border-border/50 pb-2">
                                    <Scroll className="w-6 h-6 text-accent" />
                                    <h2>História</h2>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Histórico do Personagem</Label>
                                    <Textarea
                                        placeholder="Conte a lenda do seu herói..."
                                        className="min-h-[150px] bg-background/50 border-accent/20 focus:border-accent"
                                        value={formData.backstory}
                                        onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                                    />
                                </div>

                                <div className="bg-accent/10 p-4 rounded-lg border border-accent/20 space-y-2">
                                    <h3 className="font-cinzel font-bold text-accent">Resumo</h3>
                                    <p><span className="text-muted-foreground">Nome:</span> {formData.name}</p>
                                    <p><span className="text-muted-foreground">Raça:</span> {formData.race}</p>
                                    <p><span className="text-muted-foreground">Classe:</span> {formData.class}</p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={step === 1}
                                className="border-accent/30 text-muted-foreground hover:text-accent"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
                            </Button>

                            {step < 3 ? (
                                <Button
                                    onClick={handleNext}
                                    className="bg-accent text-background hover:bg-accent/90"
                                    disabled={step === 1 && (!formData.name || !formData.race || !formData.class)}
                                >
                                    Próximo <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    className="bg-accent text-background hover:bg-accent/90 w-full md:w-auto"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                                    {isSubmitting ? "Forjando..." : "Criar Personagem"}
                                </Button>
                            )}
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
