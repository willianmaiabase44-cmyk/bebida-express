import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Login/cadastro de cliente por celular.
// Se o celular já existe, retorna os dados do cliente + endereços.
// Se não existe e veio name + address, cria o cliente e o primeiro endereço.
// Se não existe e não veio name, retorna { exists: false } para o frontend
// mostrar o formulário de cadastro.
function normalizePhone(phone) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { phone, name, address } = body;

    if (!phone) return Response.json({ error: "Celular é obrigatório" }, { status: 400 });

    const normalizedPhone = normalizePhone(phone);

    // Busca cliente pelo celular
    const customers = await base44.asServiceRole.entities.Customer.filter({ phone: normalizedPhone });
    const existing = customers?.[0];

    if (existing) {
      const addresses = await base44.asServiceRole.entities.CustomerAddress.filter(
        { customer_id: existing.id },
        "-created_date"
      );
      return Response.json({
        customer: existing,
        addresses: addresses || [],
        is_new: false,
      });
    }

    // Cliente novo — precisa de nome (endereço é opcional, adicionado no checkout)
    if (!name) {
      return Response.json({ exists: false });
    }

    const customer = await base44.asServiceRole.entities.Customer.create({
      name,
      phone: normalizedPhone,
    });

    // Se veio endereço completo, cria junto
    if (address && address.cep && address.street && address.number && address.district && address.city && address.state) {
      const addr = await base44.asServiceRole.entities.CustomerAddress.create({
        customer_id: customer.id,
        label: address.label || "Casa",
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement || "",
        district: address.district,
        city: address.city,
        state: address.state,
        reference: address.reference || "",
      });

      return Response.json({
        customer,
        addresses: [addr],
        is_new: true,
      });
    }

    return Response.json({
      customer,
      addresses: [],
      is_new: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}