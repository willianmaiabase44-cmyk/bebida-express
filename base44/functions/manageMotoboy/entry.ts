import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { hashPassword } from "../../shared/auth.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Apenas administradores podem gerenciar motoboys" }, { status: 403 });
    }

    const body = await req.json();
    const action = body?.action; // "create" | "update"
    const data = body?.data || {};

    if (!action || !data.name || !data.phone || !data.login) {
      return Response.json({ error: "Nome, telefone e login são obrigatórios" }, { status: 400 });
    }

    const login = data.login.trim().toLowerCase();

    // Verifica se login já existe (para outro motoboy)
    const existing = await base44.asServiceRole.entities.DeliveryDriver.filter({ login });
    if (existing?.length > 0 && existing[0].id !== data.id) {
      return Response.json({ error: "Login já está em uso" }, { status: 409 });
    }

    const driverData = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      login,
      vehicle_type: data.vehicle_type || "moto",
      plate: data.plate || "",
      status: data.status || "disponivel",
      active: data.active !== false,
    };

    if (action === "create") {
      if (!data.password) {
        return Response.json({ error: "Senha é obrigatória no cadastro" }, { status: 400 });
      }
      const { hash, salt } = await hashPassword(data.password);
      const created = await base44.asServiceRole.entities.DeliveryDriver.create({
        ...driverData,
        password_hash: hash,
        password_salt: salt,
      });
      return Response.json({ driver: created });
    } else if (action === "update") {
      if (!data.id) return Response.json({ error: "ID é obrigatório para atualizar" }, { status: 400 });
      const update = { ...driverData };
      if (data.password) {
        const { hash, salt } = await hashPassword(data.password);
        update.password_hash = hash;
        update.password_salt = salt;
      }
      const updated = await base44.asServiceRole.entities.DeliveryDriver.update(data.id, update);
      return Response.json({ driver: updated });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}