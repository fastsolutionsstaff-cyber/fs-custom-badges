import { json } from "@remix-run/node";
import db from "../db.server.js";

// GET: Fetch Active Badges for Storefront
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const badges = await db.badge.findMany({
      where: { shop, enabled: true },
      include: { products: true },
    });

    const responseBadges = badges.map((b) => ({
      id: b.id,
      text: b.text,
      bgColor: b.bgColor,
      textColor: b.textColor,
      position: b.position,
      fontSize: b.fontSize || 11,
      icon: b.icon || "",
      shape: b.shape || "pill",
      isGlobal: b.isGlobal,
      productIds: b.products.map((p) => p.productId),
    }));

    return json(
      { badges: responseBadges },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

// POST: Track Impressions & Clicks Realtime
export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const { badgeId, type } = body;

    if (!badgeId || !type) {
      return json({ error: "Missing tracking data" }, { status: 400 });
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

    return json(
      { success: true },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};