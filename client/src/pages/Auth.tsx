import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Scroll, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
    const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"player" | "master">("player");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await loginWithEmail(email, password);
            // Redirect handled by useAuth
        } catch (error: any) {
            toast({
                title: "Erro ao entrar",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await registerWithEmail(email, password, name, role);
            toast({
                title: "Conta criada!",
                description: `Bem-vindo, ${name}!`
            });
            // Redirect handled by useAuth
        } catch (error: any) {
            toast({
                title: "Erro ao criar conta",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-cinzel font-bold text-accent drop-shadow-md">Portão do Reino</h1>
                    <p className="text-muted-foreground font-lora">Identifique-se para cruzar a fronteira.</p>
                </div>

                <Card className="border-accent/30 bg-card/60 backdrop-blur-md shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center font-cinzel text-white">Acesso Restrito</CardTitle>
                        <CardDescription className="text-center font-lora">
                            Escolha seu método de entrada
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4 bg-background/50 border border-accent/20">
                                <TabsTrigger value="login" className="data-[state=active]:bg-accent data-[state=active]:text-background font-bold">Entrar</TabsTrigger>
                                <TabsTrigger value="register" className="data-[state=active]:bg-accent data-[state=active]:text-background font-bold">Criar Conta</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" placeholder="seu@email.com" required
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            className="bg-background/50 border-accent/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Senha</Label>
                                        <Input id="password" type="password" required
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            className="bg-background/50 border-accent/20" />
                                    </div>
                                    <Button type="submit" className="w-full bg-accent text-background hover:bg-accent/90 font-bold" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                        Entrar
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register">
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-name">Nome do Aventureiro</Label>
                                        <Input id="reg-name" type="text" placeholder="Como você será conhecido?" required
                                            value={name} onChange={e => setName(e.target.value)}
                                            className="bg-background/50 border-accent/20" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Sua Vocação</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div onClick={() => setRole("player")} className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${role === 'player' ? 'bg-accent/20 border-accent' : 'bg-card/40 border-border hover:border-accent/50'}`}>
                                                <Shield className="w-8 h-8 text-accent" />
                                                <span className="font-bold text-sm">Jogador</span>
                                            </div>
                                            <div onClick={() => setRole("master")} className={`cursor-pointer border rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${role === 'master' ? 'bg-accent/20 border-accent' : 'bg-card/40 border-border hover:border-accent/50'}`}>
                                                <Scroll className="w-8 h-8 text-accent" />
                                                <span className="font-bold text-sm">Mestre</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reg-email">Email</Label>
                                        <Input id="reg-email" type="email" placeholder="seu@email.com" required
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            className="bg-background/50 border-accent/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-password">Senha</Label>
                                        <Input id="reg-password" type="password" required
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            className="bg-background/50 border-accent/20" />
                                    </div>
                                    <Button type="submit" className="w-full bg-accent text-background hover:bg-accent/90 font-bold" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scroll className="mr-2 h-4 w-4" />}
                                        Criar Grimório
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-muted/20" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                            </div>
                        </div>

                        <Button variant="outline" type="button" className="w-full border-accent/20 text-muted-foreground hover:text-accent hover:bg-accent/10" onClick={() => loginWithGoogle()}>
                            Google
                        </Button>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
