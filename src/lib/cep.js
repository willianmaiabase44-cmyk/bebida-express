// Busca de endereço por CEP via API ViaCEP (gratuita, sem chave)
export async function lookupCep(cep) {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      cep: data.cep,
      street: data.logradouro || "",
      district: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
      complement: data.complemento || "",
    };
  } catch {
    return null;
  }
}

export function formatCep(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}