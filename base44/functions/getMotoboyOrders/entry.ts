import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const motoboyId = body?.motoboy_id;
    const type = body?.type || "active"; // "active" | "history"

    if (!motoboyId) return Response.json({ error: "Motoboy é obrigatório" }, { status: 400 });

    const allOrders = await base44.asServiceRole.entities.Order.filter(
      { motoboy_id: motoboyId },
      "-created_date",
      200
    );

    let filtered;
    if (type === "active") {
      filtered = (allOrders || []).filter(o =>
        o.motoboy_id === motoboyId &&
        ["pronto", "saiu_para_entrega"].includes(o.status)
      );
    } else {
      filtered = (allOrders || []).filter(o =>
        o.motoboy_id === motoboyId &&
        ["entregue", "cancelado"].includes(o.status)
      );
    }

    return Response.json({ orders: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}