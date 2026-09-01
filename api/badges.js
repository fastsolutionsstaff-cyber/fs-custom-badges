import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function cleanProductId(id) {
  if (!id) return "";
  return String(id).replace("gid://shopify/Product/", "").trim();
}

export default async function handler(req, res) {
  // CORS Headers for Shopify Storefront access
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const shop = req.query.shop || req.body?.shop;
  const rawProductId = req.query.productId || req.body?.productId;

  if (!shop) {
    return res.status(400).json({ success: false, error: "Shop parameter missing" });
  }

  try {
    const now = new Date();

    const badges = await prisma.badge.findMany({
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
        isGlobal: b.targetType === "GLOBAL",
        customCss: b.customCss || ""
      };
    });

    let filteredBadges = formattedBadges;
    if (rawProductId) {
      const cleanId = cleanProductId(rawProductId);
      filteredBadges = formattedBadges.filter((badge) => {
        if (badge.targetType === "GLOBAL" || badge.isGlobal) return true;
        if (badge.targetType === "SPECIFIC_PRODUCTS") return badge.productIds.includes(cleanId);
        return true;
      });
    }

    const settings = await prisma.appSettings.findUnique({
      where: { shop },
      select: { globalCustomCss: true },
    });

    return res.status(200).json({
      success: true,
      badges: filteredBadges,
      globalCustomCss: settings?.globalCustomCss || "",
    });
  } catch (error) {
    console.error("[API Badges Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}