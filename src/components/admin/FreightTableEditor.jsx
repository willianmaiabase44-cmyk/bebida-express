import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/constants';

export default function FreightTableEditor({ value = [], onChange }) {
  const sorted = useMemo(() =>
    [...value].map((v, i) => ({ ...v, _idx: i })).sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0)),
    [value]
  );

  const duplicates = useMemo(() => {
    const dists = value.map(v => v.distance_km);
    return new Set(dists.filter((d, i) => dists.indexOf(d) !== i));
  }, [value]);

  const update = (index, field, val) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const remove = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const add = () => {
    const lastDist = sorted.length > 0 ? sorted[sorted.length - 1].distance_km : 0;
    const lastPrice = sorted.length > 0 ? sorted[sorted.length - 1].price : 0;
    onChange([...value, { distance_km: lastDist + 5, price: lastPrice + 5 }]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Distância até (KM)</span>
        <span>Valor do frete (R$)</span>
        <span></span>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma faixa cadastrada. Clique em "Adicionar Faixa".</p>
      )}

      {sorted.map((range) => {
        const isDup = duplicates.has(range.distance_km);
        const isMax = range._idx === sorted[sorted.length - 1]?._idx;
        return (
          <div key={range._idx} className="grid grid-cols-[1fr_1fr_36px] gap-2 items-center">
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                value={range.distance_km}
                onChange={e => update(range._idx, 'distance_km', parseFloat(e.target.value) || 0)}
                className={isDup ? 'border-red-500 bg-red-500/5' : ''}
              />
              {isMax && sorted.length > 1 && (
                <span className="absolute -top-2 right-2 text-[9px] bg-primary text-primary-foreground px-1.5 rounded-full">Máx</span>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={range.price}
              onChange={e => update(range._idx, 'price', parseFloat(e.target.value) || 0)}
            />
            <Button variant="ghost" size="icon" onClick={() => remove(range._idx)} className="text-muted-foreground hover:text-red-400 h-9 w-9">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}

      {duplicates.size > 0 && (
        <p className="text-xs text-red-400">⚠ Existem faixas com a mesma distância. Ajuste para evitar conflitos.</p>
      )}

      <Button variant="outline" onClick={add} className="w-full gap-2">
        <Plus className="w-4 h-4" /> Adicionar Faixa
      </Button>

      {sorted.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
          <p className="text-muted-foreground mb-1">Exemplos de cálculo:</p>
          {sorted.slice(0, 3).map((r, i) => (
            <p key={i} className="text-xs">Até {r.distance_km} km → <span className="font-bold text-primary">{formatPrice(r.price)}</span></p>
          ))}
          <p className="text-muted-foreground pt-1 border-t border-primary/20 mt-1 text-xs">
            Distância máxima de entrega: <span className="font-bold text-primary">{sorted[sorted.length - 1].distance_km} km</span>
          </p>
        </div>
      )}
    </div>
  );
}