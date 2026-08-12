import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { verifyPassword } from "../../shared/auth.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const login = (body?.login || "").trim().toLowerCase();
    const password = body?.password || "";

    if (!login || !password) {
      return Response.json({ error: "Login e senha são obrigatórios" }, { status: 400 });
    }

    const drivers = await base44.asServiceRole.entities.DeliveryDriver.filter({ login });
    const driver = drivers?.[0];

    if (!driver) {
      return Response.json({ error: "Login ou senha inválidos" }, { status: 401 });
    }

    if (!driver.active) {
      return Response.json({ error: "Conta inativa. Contate o administrador." }, { status: 403 });
    }

    const valid = await verifyPassword(password, driver.password_hash, driver.password_salt);
    if (!valid) {
      return Response.json({ error: "Login ou senha inválidos" }, { status: 401 });
    }

    // Retorna dados do motoboy sem campos sensíveis
    const { password_hash, password_salt, ...safeDriver } = driver;
    return Response.json({ driver: safeDriver });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}