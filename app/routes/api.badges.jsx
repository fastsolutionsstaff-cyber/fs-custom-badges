import { json } from "@remix-run/node";
import db from "../db.server.js";

// Helper to clean GraphQL ID (e.g., "gid://shopify/Product/12345" -> "12345")
function cleanProductId(id) {
  if (!id) return "";
  return String(id).replace("gid://shopify/Product/", "").trim();
}

/* =========================================================
   OPTIONS / PREFLIGHT REQUEST (FOR CORS)
========================================================= */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const rawProductId = url.searchParams.get("productId");
  const rawTags = url.searchParams.get("tags") || "";
  const price = parseFloat(url.searchParams.get("price") || "0");
  const inventory = parseInt(url.searchParams.get("inventory") || "0", 10);

  // CORS Headers for Shopify Storefront
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60, s-maxage=300", // Edge caching for high traffic
  };

  if (!shop) {
    return json({ success: false, error: "Shop parameter is missing" }, { status: 400, headers: corsHeaders });
  }

  const productId = cleanProductId(rawProductId);
  const productTags = rawTags.split(",").map((t) => t.trim().toLowerCase());
  const now = new Date();

  // Fetch all enabled badges for this shop
  const badges = await db.badge.findMany({
    where: {
      shop,
      enabled: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } }
      ],
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] }
      ]
    },
    include: {
      products: true,
    },
    orderBy: [
      { priority: "desc" }, // Highest priority first
      { createdAt: "desc" }
    ],
  });

  // Filter badges matching target criteria
  const matchingBadges = badges.filter((badge) => {
    // 1. GLOBAL
    if (badge.targetType === "GLOBAL") return true;

    // 2. SPECIFIC PRODUCTS
    if (badge.targetType === "SPECIFIC_PRODUCTS") {
      if (!productId) return false;
      return badge.products.some(
        (p) => cleanProductId(p.productId) === productId
      );
    }

    // 3. PRODUCT TAGS
    if (badge.targetType === "PRODUCT_TAGS") {
      if (!badge.targetTags) return false;
      const targetTags = badge.targetTags
        .split(",")
        .map((t) => t.trim().toLowerCase());
      
      // Match if product has at least one matching tag
      return targetTags.some((tag) => productTags.includes(tag));
    }

    // 4. INVENTORY LEVEL
    if (badge.targetType === "INVENTORY_LEVEL") {
      return inventory >= badge.minInventory && inventory <= badge.maxInventory;
    }

    // 5. PRICE RANGE
    if (badge.targetType === "PRICE_RANGE") {
      return price >= badge.minPrice && price <= badge.maxPrice;
    }

    return false;
  });

  // Global CSS settings
  const settings = await db.appSettings.findUnique({
    where: { shop },
    select: { globalCustomCss: true },
  });

  return json(
    {
      success: true,
      badges: matchingBadges,
      globalCss: settings?.globalCustomCss || "",
    },
    { headers: corsHeaders }
  );
};