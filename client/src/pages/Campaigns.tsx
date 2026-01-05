import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Scroll, Users, ArrowLeft, Sword } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";

interface Campaign {
  id: string;
  name: string;
  system: string;
  description: string;
  masterId: string;
  status: string;
}

export default function Campaigns() {
  const { user, isLoading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerCampaigns = async () => {
      if (!user) return;
      try {
        // 1. Get all characters for this user that are in a campaign
        const charsQuery = query(
          collection(db, "characters"),
          where("userId", "==", user.id)
        );

        const charsSnap = await getDocs(charsQuery);
        const campaignIds = new Set<string>();

        charsSnap.forEach(doc => {
          const data = doc.data();
          if (data.campaignId) {
            campaignIds.add(data.campaignId);
          }
        });

        if (campaignIds.size === 0) {
          setCampaigns([]);
          return;
        }

        // 2. Fetch campaign details
        // Firestore 'in' limit is 10, so we might need batches eventually, but simple for now
        const campaignsQuery = query(
          collection(db, "campaigns"),
          where(documentId(), "in", Array.from(campaignIds))
        );

        const campaignsSnap = await getDocs(campaignsQuery);
        const fetchedCampaigns: Campaign[] = [];
        campaignsSnap.forEach(doc => {
          fetchedCampaigns.push({ id: doc.id, ...doc.data() } as Campaign);
        });

        setCampaigns(fetchedCampaigns);

      } catch (error) {
        console.error("Error fetching player campaigns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPlayerCampaigns();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading]);


  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-accent w-12 h-12" />
          <p className="text-muted-foreground">Carregando suas aventuras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-accent/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <a className="p-2 hover:bg-accent/10 rounded-lg transition-colors cursor-pointer">
                <ArrowLeft className="w-5 h-5 text-accent" />
              </a>
            </Link>
            <div className="flex items-center gap-3">
              <Scroll className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold text-accent tracking-wider font-cinzel">MINHAS CAMPANHAS</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        {campaigns.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="relative p-12 border border-accent/30 rounded-xl bg-card/50 backdrop-blur-sm text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent rounded-xl" />
              <div className="relative space-y-6">
                <Scroll className="w-16 h-16 text-accent/40 mx-auto" />
                <h2 className="text-3xl font-bold text-foreground font-cinzel">Nenhuma Campanha Encontrada</h2>
                <p className="text-muted-foreground text-lg">
                  Você ainda não participa de nenhuma campanha.
                </p>
                <Link href="/">
                  <Button className="bg-accent text-background hover:bg-accent/90 px-8 py-6 font-bold">
                    Voltar para Início
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign, idx) => (
                <Link key={campaign.id} href={`/campaigns/join/${campaign.id}`}>
                  <div className="block group cursor-pointer animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="relative overflow-hidden rounded-xl border border-accent/30 hover:border-accent/60 transition-all h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="relative p-6 bg-card/50 backdrop-blur-sm h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-accent transition-colors font-cinzel">
                              {campaign.name}
                            </h3>
                            <p className="text-sm text-accent font-semibold">{campaign.system}</p>
                          </div>
                          <Sword className="w-5 h-5 text-accent/40 flex-shrink-0" />
                        </div>

                        <p className="text-sm text-muted-foreground mb-6 flex-grow font-lora line-clamp-3">
                          {campaign.description || "Uma aventura misteriosa..."}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-accent/20">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>Participante</span>
                          </div>
                          <span className="text-xs text-accent font-bold group-hover:translate-x-1 transition-transform">
                            Ver Detalhes →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
