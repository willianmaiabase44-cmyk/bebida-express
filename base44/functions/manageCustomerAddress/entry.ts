import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// CRUD de endereços do cliente via asServiceRole (RLS admin-only).
// Ações: create, update, delete, list.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, customer_id, address_id, address } = body;

    if (!customer_id) return Response.json({ error: "customer_id obrigatório" }, { status: 400 });

    if (action === "create") {
      const created = await base44.asServiceRole.entities.CustomerAddress.create({
        ...address,
        customer_id,
      });
      return Response.json({ address: created });
    }

    if (action === "update") {
      if (!address_id) return Response.json({ error: "address_id obrigatório" }, { status: 400 });
      const updated = await base44.asServiceRole.entities.CustomerAddress.update(address_id, address);
      return Response.json({ address: updated });
    }

    if (action === "delete") {
      if (!address_id) return Response.json({ error: "address_id obrigatório" }, { status: 400 });
      await base44.asServiceRole.entities.CustomerAddress.delete(address_id);
      return Response.json({ success: true });
    }

    if (action === "list") {
      const list = await base44.asServiceRole.entities.CustomerAddress.filter(
        { customer_id },
        "-created_date"
      );
      return Response.json({ addresses: list || [] });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}