import { json } from "@remix-run/node";
import db from "../db.server";

function cleanProductId(id) {
  if (!id) return "";
  return String(id).replace("gid://shopify/Product/", "").trim();
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const rawProductId = url.searchParams.get("productId");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=15, s-maxage=30",
  };

  if (!shop) {
    return json({ success: false, error: "Shop parameter missing" }, { status: 400, headers: corsHeaders });
  }

  const now = new Date();

  try {
    const badges = await db.badge.findMany({
      where: {
        shop,
        enabled: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      include: { products: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    const formattedBadges = badges.map((b) => ({
      id: b.id,
      name: b.name,
      enabled: b.enabled,
      text: b.text,
      icon: b.icon,
      bgColor: b.bgColor,
      textColor: b.textColor,
      borderColor: b.borderColor,
      position: b.position,
      shape: b.shape,
      fontSize: b.fontSize,
      fontWeight: b.fontWeight,
      paddingX: b.paddingX,
      paddingY: b.paddingY,
      borderRadius: b.borderRadius,
      priority: b.priority,
      targetType: b.targetType,
      productIds: b.products ? b.products.map((p) => cleanProductId(p.productId)) : [],
      isGlobal: b.targetType === "GLOBAL",
      customCss: b.customCss || "",
    }));

    let filteredBadges = formattedBadges;
    if (rawProductId) {
      const cleanId = cleanProductId(rawProductId);
      filteredBadges = formattedBadges.filter((badge) => {
        if (badge.targetType === "GLOBAL" || badge.isGlobal) return true;
        if (badge.targetType === "SPECIFIC_PRODUCTS") {
          return badge.productIds.includes(cleanId);
        }
        return true;
      });
    }

    const settings = await db.appSettings.findUnique({
      where: { shop },
      select: { globalCustomCss: true },
    });

    return json(
      { success: true, badges: filteredBadges, globalCustomCss: settings?.globalCustomCss || "" },
      { headers: corsHeaders }
    );
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
};

export const action = async ({ request }) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await request.json();
    const { badgeId, eventType } = body;

    if (badgeId && eventType) {
      if (eventType === "IMPRESSION") {
        await db.badge.update({ where: { id: badgeId }, data: { impressions: { increment: 1 } } });
      } else if (eventType === "CLICK") {
        await db.badge.update({ where: { id: badgeId }, data: { clicks: { increment: 1 } } });
      }
    }
    return json({ success: true }, { headers: corsHeaders });
  } catch {
    return json({ success: false }, { status: 400, headers: corsHeaders });
  }
};