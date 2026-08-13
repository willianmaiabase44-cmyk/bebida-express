import React, { useState } from "react";
import { Link as LinkIcon, Copy, ExternalLink, Bike, ShoppingCart, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AccessLinks() {
  const origin = window.location.origin;
  const [copied, setCopied] = useState(null);

  const links = [
    {
      id: "delivery",
      icon: ShoppingCart,
      title: "Delivery — Link dos Clientes",
      description: "Link público onde os clientes entram para fazer pedidos.",
      url: `${origin}/`,
      openLabel: "Abrir Site",
      accent: "text-primary",
    },
    {
      id: "motoboy",
      icon: Bike,
      title: "Área do Motoboy",
      description: "Link onde os motoboys fazem login para acessar suas entregas.",
      url: `${origin}/motoboy`,
      openLabel: "Abrir Área do Motoboy",
      accent: "text-primary",
    },
  ];

  const handleCopy = async (link) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(link.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <LinkIcon className="w-6 h-6 text-primary" />
          Links de Acesso
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Copie e compartilhe os links principais do sistema com clientes e motoboys.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Card key={link.id} className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <link.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base font-heading">{link.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{link.description}</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-xs text-muted-foreground font-mono truncate flex-1">
                  {link.url}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopy(link)}
                  className="flex-1"
                  variant={copied === link.id ? "secondary" : "default"}
                >
                  {copied === link.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      Link copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => window.open(link.url, "_blank")}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  {link.openLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}