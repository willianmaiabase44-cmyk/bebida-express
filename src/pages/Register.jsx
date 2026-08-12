import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Loader2, User } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useCustomer } from "@/context/CustomerContext";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useCustomer();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (val) => {
    let d = val.replace(/\D/g, "");
    if (d.length > 11) d = d.slice(0, 11);
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
        `(${a}) ${b}${c ? `-${c}` : ""}`.trim()
      );
    }
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) =>
      `(${a}) ${b}${c ? `-${c}` : ""}`.trim()
    );
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Digite um celular válido com DDD");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("customerAuth", { phone: cleanPhone });
      const data = res.data;
      if (data.error) {
        setError(data.error);
      } else if (data.exists === false) {
        setStep("name");
      } else if (data.customer) {
        login(data.customer);
        toast.success(`Bem-vindo, ${data.customer.name}!`);
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao verificar celular");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Digite seu nome");
      return;
    }
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const res = await base44.functions.invoke("customerAuth", {
        phone: cleanPhone,
        name: name.trim(),
      });
      const data = res.data;
      if (data.error) {
        setError(data.error);
      } else if (data.customer) {
        login(data.customer);
        toast.success("Bem-vindo à Smoke Bebidas!");
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  if (step === "name") {
    return (
      <AuthLayout
        icon={User}
        title="Como podemos te chamar?"
        subtitle={`Celular: ${phone}`}
        footer={
          <button onClick={() => setStep("phone")} className="text-primary font-medium hover:underline">
            Voltar
          </button>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              autoFocus
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar na loja"
            )}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Smartphone}
      title="Entrar na loja"
      subtitle="Digite seu celular para continuar"
      footer={
        <>
          É administrador?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Fazer login
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Celular</Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              autoFocus
              placeholder="(51) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}