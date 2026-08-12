import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Bike, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMotoboy } from '@/context/MotoboyContext';

export default function MotoboyLogin() {
  const navigate = useNavigate();
  const { login } = useMotoboy();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await base44.functions.invoke('motoboyLogin', {
        login: loginValue.trim().toLowerCase(),
        password,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else if (res.data?.driver) {
        login(res.data.driver);
        toast.success('Bem-vindo, ' + res.data.driver.name + '!');
        navigate('/motoboy');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
            <Bike className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Área do Motoboy</h1>
            <p className="text-muted-foreground text-sm mt-1">Smoke Bebidas</p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input
                  id="login"
                  value={loginValue}
                  onChange={(e) => setLoginValue(e.target.value)}
                  placeholder="seu_login"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Voltar à loja
          </Link>
        </div>
      </div>
    </div>
  );
}