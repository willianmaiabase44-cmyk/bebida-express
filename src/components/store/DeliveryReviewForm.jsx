import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryReviewForm({ order, customer, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Selecione uma nota');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('submitDeliveryReview', {
        order_id: order.id,
        customer_id: customer.id,
        rating,
        comment: comment.trim(),
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success('Avaliação enviada. Obrigado!');
        onSubmitted?.();
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="font-heading font-bold text-lg">Avalie sua entrega</h3>
        <p className="text-sm text-muted-foreground">Como foi a entrega do pedido #{order.order_number}?</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                n <= (hover || rating) ? 'fill-primary text-primary' : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground text-center">Comentário (opcional)</p>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte como foi sua experiência..."
          rows={3}
          maxLength={300}
        />
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={loading || rating === 0}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Avaliação'}
      </Button>
    </div>
  );
}