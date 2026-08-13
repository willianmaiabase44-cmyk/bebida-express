import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Valida um cupom de desconto no backend.
// Não requer auth da plataforma — clientes usam sessão por celular.
// Retorna { valid, discount, discount_percent, coupon_code, message } ou { valid: false, message }.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { coupon_code, customer_id, subtotal } = body;

    if (!coupon_code) {
      return Response.json({ valid: false, message: "Informe um cupom" }, { status: 400 });
    }
    if (subtotal == null || subtotal < 0) {
      return Response.json({ valid: false, message: "Subtotal inválido" }, { status: 400 });
    }

    const code = String(coupon_code).toUpperCase().trim();
    const coupons = await base44.asServiceRole.entities.Coupon.filter({ code });
    const coupon = coupons?.[0];

    if (!coupon) {
      return Response.json({ valid: false, message: "Cupom não encontrado" }, { status: 404 });
    }
    if (!coupon.active) {
      return Response.json({ valid: false, message: "Cupom inativo" }, { status: 403 });
    }

    const today = new Date().toISOString().split("T")[0];
    if (coupon.start_date && today < coupon.start_date) {
      return Response.json({ valid: false, message: "Cupom ainda não está disponível" }, { status: 403 });
    }
    if (coupon.end_date && today > coupon.end_date) {
      return Response.json({ valid: false, message: "Cupom expirado" }, { status: 403 });
    }

    if (coupon.max_uses > 0 && (coupon.used_count || 0) >= coupon.max_uses) {
      return Response.json({ valid: false, message: "Cupom esgotado" }, { status: 403 });
    }

    if (coupon.min_order_value > 0 && subtotal < coupon.min_order_value) {
      return Response.json({
        valid: false,
        message: `Valor mínimo do pedido: R$ ${coupon.min_order_value.toFixed(2).replace(".", ",")}`,
      }, { status: 403 });
    }

    if (coupon.per_customer_limit > 0 && customer_id) {
      const customerUses = (coupon.used_by || []).filter((id) => id === customer_id).length;
      if (customerUses >= coupon.per_customer_limit) {
        return Response.json({ valid: false, message: "Você já usou este cupom" }, { status: 403 });
      }
    }

    const discount = Math.round(subtotal * coupon.discount_percent) / 100;

    return Response.json({
      valid: true,
      discount,
      discount_percent: coupon.discount_percent,
      coupon_code: coupon.code,
      message: `Cupom aplicado: ${coupon.discount_percent}% de desconto`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}