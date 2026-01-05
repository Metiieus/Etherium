import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Wand2, Scroll } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Campaign {
  id: string;
  name: string;
  description: string;
  system: string;
  masterId: string;
  status: string;
  createdAt: string;
}

export default function Master() {
  const { user, isLoading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Realtime Listener
    const q = query(collection(db, "campaigns"), where("masterId", "==", user.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camps: Campaign[] = [];
      snapshot.forEach((doc) => {
        camps.push({ id: doc.id, ...doc.data() } as Campaign);
      });
      // Client-side sort to avoid index requirements
      camps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCampaigns(camps);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching campaigns:", error);
      toast({ title: "Erro ao carregar campanhas", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system: "D&D 5e",
  });

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Nome da campanha é obrigatório", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "Erro de autenticação", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, "campaigns"), {
        ...formData,
        masterId: user.id,
        status: "active",
        createdAt: new Date().toISOString()
      });
      toast({ title: "Campanha criada com sucesso!" });
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", system: "D&D 5e" });
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({ title: "Erro ao criar campanha", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-accent w-12 h-12" />
          <p className="text-muted-foreground">Carregando grimório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700">
      {/* Header */}
      <header className="border-b border-border bg-card/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
              <Wand2 className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-2xl font-bold font-cinzel text-foreground">Painel do Mestre</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-accent font-cinzel">
              ← Voltar ao Reino
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold font-cinzel text-foreground flex items-center gap-2">
            Suas Campanhas
            <span className="text-sm font-sans font-normal text-muted-foreground bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
              {campaigns.length}
            </span>
          </h2>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 font-bold shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                <Plus className="w-4 h-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-accent/20">
              <DialogHeader>
                <DialogTitle className="font-cinzel text-accent">Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Comece uma nova lenda. Preencha os detalhes abaixo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input
                    placeholder="Ex: A Tumba da Aniquilação"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-background/50 border-accent/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sistema</Label>
                  <select
                    value={formData.system}
                    onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                    className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="D&D 5e">D&D 5e</option>
                    <option value="Pathfinder">Pathfinder</option>
                    <option value="Tormenta20">Tormenta 20</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Um breve resumo da aventura..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-background/50 border-accent/20 min-h-[100px]"
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full bg-accent text-accent-foreground font-bold" disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Criar Aventura
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Campaigns List */}
        <div>
          {campaigns.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-accent/10 rounded-xl bg-card/20 animate-in fade-in zoom-in-95 duration-500">
              <Scroll className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-cinzel text-muted-foreground mb-2">O Grimório está Vazio</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Você ainda não mestra nenhuma campanha.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="border-accent/30 text-accent hover:bg-accent/10">
                Criar Minha Primeira Campanha
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign, index) => (
                <Link key={campaign.id} href={`/master/campaign/${campaign.id}`}>
                  <div className="block cursor-pointer animate-in slide-in-from-bottom-4 fade-in duration-500" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
                    <Card className="border border-accent/20 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-accent/50 transition-all group overflow-hidden h-full">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent/0 group-hover:bg-accent transition-all duration-300" />
                      <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-xl font-cinzel text-foreground group-hover:text-accent transition-colors line-clamp-1">{campaign.name}</CardTitle>
                          {campaign.status === 'active' && <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)] mt-2" />}
                        </div>
                        <CardDescription className="font-lora text-xs uppercase tracking-wider">{campaign.system}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[3em] font-lora">
                          {campaign.description || "Sem descrição"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-accent/10 pt-4 mt-auto">
                          <span className="opacity-70">Criado em</span>
                          <span className="font-mono">{new Date(campaign.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
