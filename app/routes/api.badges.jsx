import { json } from "@remix-run/node";
import db from "../db.server.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
};

export const options = async () => new Response(null, { status: 204, headers: corsHeaders });

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing Storefront Domain" }, { status: 400, headers: corsHeaders });
  }

  try {
    const settings = await db.appSettings.findUnique({ where: { shop } });
    const badges = await db.badge.findMany({
      where: { shop, enabled: true },
      include: { products: true },
      orderBy: { priority: "desc" },
    });

    const parsed = badges.map((b) => ({
      id: b.id,
      text: b.text,
      bgColor: b.bgColor,
      textColor: b.textColor,
      borderColor: b.borderColor,
      position: b.position,
      shape: b.shape,
      icon: b.icon,
      fontSize: b.fontSize,
      paddingX: b.paddingX,
      paddingY: b.paddingY,
      borderRadius: b.borderRadius,
      priority: b.priority,
      targetType: b.targetType,
      targetTags: b.targetTags ? b.targetTags.split(",").map((t) => t.trim().toLowerCase()) : [],
      minInventory: b.minInventory,
      maxInventory: b.maxInventory,
      minPrice: b.minPrice,
      maxPrice: b.maxPrice,
      customCss: b.customCss,
      hideOnMobile: b.hideOnMobile ?? false,
      hideOnDesktop: b.hideOnDesktop ?? false,
      productIds: b.products.map((p) => p.productId.replace(/\D/g, "")),
    }));

    return json({ badges: parsed, globalCustomCss: settings?.globalCustomCss || "" }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
};

export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const { badgeId, eventType } = body;

    if (!badgeId || !eventType) {
      return json({ error: "Invalid Event Signature" }, { status: 400, headers: corsHeaders });
    }

    if (eventType === "IMPRESSION") {
      await db.badge.update({ where: { id: badgeId }, data: { impressions: { increment: 1 } } });
    } else if (eventType === "CLICK") {
      await db.badge.update({ where: { id: badgeId }, data: { clicks: { increment: 1 } } });
    }

    return json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
};