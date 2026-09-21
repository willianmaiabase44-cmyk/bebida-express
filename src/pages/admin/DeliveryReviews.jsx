import React, { useState, useEffect } from 'react';
import { getAllReviews } from '@/services/motoboyService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Bike, Loader2, MessageSquare } from 'lucide-react';

export default function DeliveryReviews() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAllReviews();
        if (res?.motoboys) setData(res.motoboys);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const motoboysWithReviews = data.filter(m => m.reviews_count > 0);
  const motoboysWithoutReviews = data.filter(m => m.reviews_count === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-primary" /> Avaliações de Entrega
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Avaliações dos clientes sobre os motoboys</p>
      </div>

      {data.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="py-16 text-center text-muted-foreground">
          <Bike className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Nenhum motoboy cadastrado
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {motoboysWithReviews.map(motoboy => (
            <Card key={motoboy.id} className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                {/* Resumo do motoboy */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg">{motoboy.name}</h3>
                      <p className="text-xs text-muted-foreground">{motoboy.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="font-heading text-2xl font-bold text-primary">{motoboy.rating.toFixed(1)}</span>
                      <Star className="w-5 h-5 fill-primary text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">{motoboy.total_deliveries} entregas · {motoboy.reviews_count} avaliações</p>
                  </div>
                </div>

                {/* Lista de avaliações */}
                <div className="space-y-2 pt-3 border-t border-border">
                  {motoboy.reviews.map(review => (
                    <div key={review.id} className="bg-secondary/30 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{review.order_number}</span>
                          <span className="text-xs text-muted-foreground">— {review.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          "{review.comment}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(review.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {motoboysWithoutReviews.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Sem avaliações ainda</h3>
                <div className="flex flex-wrap gap-2">
                  {motoboysWithoutReviews.map(m => (
                    <Badge key={m.id} variant="outline" className="text-muted-foreground">
                      {m.name} · {m.total_deliveries} entregas
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}