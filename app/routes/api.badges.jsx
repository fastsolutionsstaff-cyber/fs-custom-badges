import { json } from "@remix-run/node";
import db from "../db.server.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

// CORS Preflight
export const options = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

// GET: Fetch Active Badges for Storefront
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400, headers: corsHeaders });
  }

  try {
    const badges = await db.badge.findMany({
      where: { shop, enabled: true },
      include: { products: true },
    });

    const responseBadges = badges.map((b) => {
      const rawProductIds = b.products.map((p) => p.productId);
      
      // Extract numeric IDs alongside full GIDs for seamless theme matching
      const numericIds = rawProductIds.map((id) => id.replace(/\D/g, "")).filter(Boolean);

      return {
        id: b.id,
        text: b.text,
        bgColor: b.bgColor,
        textColor: b.textColor,
        position: b.position,
        fontSize: b.fontSize || 11,
        icon: b.icon || "",
        shape: b.shape || "pill",
        isGlobal: b.isGlobal,
        productIds: [...new Set([...rawProductIds, ...numericIds])],
      };
    });

    return json({ badges: responseBadges }, { headers: corsHeaders });
  } catch (error) {
    return json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
};

// POST: Track Impressions & Clicks Realtime
export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { badgeId, type } = body;

    if (!badgeId || !type) {
      return json({ error: "Missing tracking data" }, { status: 400, headers: corsHeaders });
    }

    if (type === "impression") {
      await db.badge.update({
        where: { id: badgeId },
        data: { impressions: { increment: 1 } },
      });
    } else if (type === "click") {
      await db.badge.update({
        where: { id: badgeId },
        data: { clicks: { increment: 1 } },
      });
    }

    return json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    return json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
};