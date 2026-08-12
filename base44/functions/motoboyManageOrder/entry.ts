import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body?.action; // "assign" | "accept" | "deliver"
    const orderId = body?.order_id;
    const motoboyId = body?.motoboy_id;
    const motoboyName = body?.motoboy_name;

    if (!action || !orderId) {
      return Response.json({ error: "Ação e ID do pedido são obrigatórios" }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: "Pedido não encontrado" }, { status: 404 });

    const now = new Date().toISOString();
    const history = [...(order.status_history || []), { status: "", date: now, by: "" }];

    if (action === "assign") {
      // Admin designa o motoboy e envia direto para entrega — status -> saiu_para_entrega
      const user = await base44.auth.me();
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Apenas administradores podem designar motoboys" }, { status: 403 });
      }
      if (!motoboyId) return Response.json({ error: "Motoboy é obrigatório" }, { status: 400 });

      const driver = await base44.asServiceRole.entities.DeliveryDriver.get(motoboyId);
      if (!driver) return Response.json({ error: "Motoboy não encontrado" }, { status: 404 });

      history[history.length - 1] = {
        status: "saiu_para_entrega",
        date: now,
        by: `admin — designou ${driver.name}`,
      };

      await base44.asServiceRole.entities.Order.update(orderId, {
        motoboy_id: driver.id,
        motoboy_name: driver.name,
        motoboy_assigned_at: now,
        accepted_at: now,
        status: "saiu_para_entrega",
        status_history: history,
      });

      // Marca motoboy como ocupado imediatamente
      await base44.asServiceRole.entities.DeliveryDriver.update(motoboyId, { status: "ocupado" });

      return Response.json({ ok: true, motoboy_name: driver.name });
    }

    if (action === "accept") {
      // Motoboy aceita a entrega — status -> saiu_para_entrega
      if (!motoboyId) return Response.json({ error: "Motoboy é obrigatório" }, { status: 400 });
      if (order.motoboy_id !== motoboyId) {
        return Response.json({ error: "Este pedido não foi designado para você" }, { status: 403 });
      }
      if (order.status !== "pronto") {
        return Response.json({ error: "Pedido não está aguardando aceite" }, { status: 400 });
      }

      history[history.length - 1] = { status: "saiu_para_entrega", date: now, by: "motoboy" };

      await base44.asServiceRole.entities.Order.update(orderId, {
        status: "saiu_para_entrega",
        accepted_at: now,
        status_history: history,
      });

      // Marca motoboy como ocupado
      await base44.asServiceRole.entities.DeliveryDriver.update(motoboyId, { status: "ocupado" });

      return Response.json({ ok: true });
    }

    if (action === "deliver") {
      // Motoboy marca como entregue — status -> entregue
      if (!motoboyId) return Response.json({ error: "Motoboy é obrigatório" }, { status: 400 });
      if (order.motoboy_id !== motoboyId) {
        return Response.json({ error: "Este pedido não foi designado para você" }, { status: 403 });
      }
      if (order.status !== "saiu_para_entrega") {
        return Response.json({ error: "Pedido não está em rota de entrega" }, { status: 400 });
      }

      history[history.length - 1] = { status: "entregue", date: now, by: "motoboy" };

      await base44.asServiceRole.entities.Order.update(orderId, {
        status: "entregue",
        delivered_at: now,
        status_history: history,
      });

      // Atualiza contador de entregas e status do motoboy
      const driver = await base44.asServiceRole.entities.DeliveryDriver.get(motoboyId);
      if (driver) {
        await base44.asServiceRole.entities.DeliveryDriver.update(motoboyId, {
          status: "disponivel",
          total_deliveries: (driver.total_deliveries || 0) + 1,
        });
      }

      return Response.json({ ok: true });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}