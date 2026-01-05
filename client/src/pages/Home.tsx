import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Book, Map, Users, ChevronRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent selection:text-background animate-in fade-in duration-1000">

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pb-20">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        <div className="container relative z-10 text-center px-4 pt-20">
          <h2 className="text-xl md:text-2xl font-lora text-accent tracking-[0.2em] uppercase mb-6 animate-in fade-in slide-in-from-top-8 duration-1000">As Crônicas de Aethelgard</h2>
          <h1 className="text-6xl md:text-9xl font-cinzel font-black text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.2)] leading-tight mb-8 animate-in zoom-in-50 duration-1000">
            FORJE SEU <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-yellow-200 to-accent">LEGADO</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 font-lora max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-8 duration-1000 delay-200 mb-12">
            Entre em um mundo de magia antiga, perigos ocultos e contos épicos.
            Reúna seu grupo, domine seu destino e escreva sua história nas estrelas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
            {user ? (
              <div className="flex flex-col items-center gap-6">
                <div className="p-4 rounded-lg bg-card/40 backdrop-blur-md border border-accent/20 text-center min-w-[300px]">
                  <p className="font-cinzel text-lg text-accent mb-1">Bem-vindo, {user.name || "Aventureiro"}</p>
                  <p className="text-sm text-muted-foreground font-lora">Sua jornada continua.</p>
                </div>
                <div className="flex gap-4">
                  <Link href={user.role === 'master' ? "/master" : "/profile"}>
                    <Button size="lg" className="bg-accent text-background hover:bg-yellow-400 font-bold px-8 py-6 text-lg shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all hover:scale-105">
                      {user.role === 'master' ? "Painel do Mestre" : "Minha Ficha"}
                    </Button>
                  </Link>
                  <Link href="/campaigns">
                    <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent/10 px-8 py-6 text-lg font-cinzel">
                      Minhas Campanhas
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="bg-accent text-background hover:bg-yellow-400 font-bold px-8 py-6 text-lg shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all hover:scale-105 uppercase tracking-widest font-cinzel"
                  >
                    Entrar no Reino
                  </Button>
                </Link>
                <Button variant="ghost" className="text-slate-300 hover:text-white font-lora italic">
                  Ler a Lore <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      < section className="py-24 bg-background relative" >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />

        <div className="container px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Book, title: "Narrativa Profunda", desc: "Crie e documente histórias complexas com nosso Grimório Digital." },
              { icon: Map, title: "Mapas Imersivos", desc: "Visualize o campo de batalha com clareza tática e beleza artística." },
              { icon: Users, title: "Gestão de Grupo", desc: "Acompanhe fichas, inventários e a saúde de todo o seu grupo em tempo real." }
            ].map((feature, i) => (
              <Card key={i} className="group bg-card/30 border-accent/10 hover:border-accent/40 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 relative z-10 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-900 border border-accent/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                    <feature.icon className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-cinzel font-bold text-slate-100">{feature.title}</h3>
                  <p className="text-muted-foreground font-lora leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section >

      {/* Lore Quote Section */}
      < section className="py-32 relative bg-fixed bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=2669&auto=format&fit=crop')" }
      }>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="container relative z-10 text-center max-w-3xl mx-auto space-y-6">
          <p className="text-2xl md:text-4xl font-cinzel font-bold text-white leading-normal italic">
            "Na era das sombras, apenas a luz <span className="text-accent">daqueles que ousam</span> pode perfurar a escuridão."
          </p>
          <p className="text-accent font-lora uppercase tracking-widest text-sm">- A Profecia dos Reis Caídos</p>
        </div>
      </section >

    </div >
  );
}
