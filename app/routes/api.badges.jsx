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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=30, s-maxage=60",
  };

  if (!shop) {
    return json({ success: false, error: "Shop parameter missing" }, { status: 400, headers: corsHeaders });
  }

  const now = new Date();

  const badges = await db.badge.findMany({
    where: {
      shop,
      enabled: true,
      OR: [{ startDate: null }, { startDate: { lte: now } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
    },
    include: {
      products: true,
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  const formattedBadges = badges.map((b) => {
    const productIds = b.products ? b.products.map((p) => cleanProductId(p.productId)) : [];
    const productHandles = b.products ? b.products.map((p) => p.productHandle).filter(Boolean) : [];
    
    return {
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
      productIds: productIds,
      productHandles: productHandles,
      isGlobal: b.targetType === "GLOBAL",
      customCss: b.customCss || ""
    };
  });

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

    filteredBadges.sort((a, b) => {
      if (a.targetType === "SPECIFIC_PRODUCTS" && b.targetType !== "SPECIFIC_PRODUCTS") return -1;
      if (b.targetType === "SPECIFIC_PRODUCTS" && a.targetType !== "SPECIFIC_PRODUCTS") return 1;
      return 0;
    });
  }

  const settings = await db.appSettings.findUnique({
    where: { shop },
    select: { globalCustomCss: true },
  });

  return json(
    {
      success: true,
      badges: filteredBadges,
      globalCustomCss: settings?.globalCustomCss || "",
    },
    { headers: corsHeaders }
  );
};