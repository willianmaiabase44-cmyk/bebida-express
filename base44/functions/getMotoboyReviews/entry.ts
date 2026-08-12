import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const body = await req.json();
    const motoboyId = body?.motoboy_id;

    const drivers = await base44.asServiceRole.entities.DeliveryDriver.list();
    const reviews = await base44.asServiceRole.entities.DeliveryReview.list("-created_date", 500);

    const result = (drivers || []).map(driver => {
      const driverReviews = (reviews || []).filter(r => r.motoboy_id === driver.id);
      const avg = driverReviews.length > 0
        ? driverReviews.reduce((s, r) => s + (r.rating || 0), 0) / driverReviews.length
        : driver.rating || 5;
      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        active: driver.active,
        total_deliveries: driver.total_deliveries || 0,
        rating: Math.round(avg * 10) / 10,
        reviews_count: driverReviews.length,
        reviews: driverReviews,
      };
    });

    if (motoboyId) {
      return Response.json({ motoboy: result.find(d => d.id === motoboyId) || null });
    }

    return Response.json({ motoboys: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}