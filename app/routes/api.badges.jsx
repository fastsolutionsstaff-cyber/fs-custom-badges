import { json } from "@remix-run/node";
import db from "../db.server.js";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);

    const shop = url.searchParams.get("shop");

    if (!shop) {
      return json(
        {
          success: false,
          error: "Shop is required",
        },
        { status: 400 }
      );
    }

    const badges = await db.badge.findMany({
      where: {
        shop,
        enabled: true,
      },
      include: {
        products: true,
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const formattedBadges = badges.map((badge) => ({
      id: badge.id,

      enabled: badge.enabled,

      text: badge.text,
      icon: badge.icon,

      bgColor: badge.bgColor,
      textColor: badge.textColor,
      borderColor: badge.borderColor,

      shape: badge.shape,
      position: badge.position,

      fontSize: badge.fontSize,
      fontWeight: badge.fontWeight,

      paddingX: badge.paddingX,
      paddingY: badge.paddingY,
      borderRadius: badge.borderRadius,

      customCss: badge.customCss,

      hideOnMobile: badge.hideOnMobile,
      hideOnDesktop: badge.hideOnDesktop,

      targetType: badge.targetType,

      targetTags: badge.targetTags
        ? badge.targetTags
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
        : [],

      targetCollection: badge.targetCollection,

      minInventory: badge.minInventory,
      maxInventory: badge.maxInventory,

      minPrice: badge.minPrice,
      maxPrice: badge.maxPrice,

      startDate: badge.startDate,
      endDate: badge.endDate,

      priority: badge.priority,

      productIds: badge.products.map(
        (product) => product.productId
      ),
    }));

    return json({
      success: true,
      badges: formattedBadges,
    });
  } catch (error) {
    console.error("BADGES API ERROR:", error);

    return json(
      {
        success: false,
        error: "Failed to load badges",
        badges: [],
      },
      { status: 500 }
    );
  }
}

export async function action({ request }) {
  try {
    const body = await request.json();

    const badgeId = String(body.badgeId || "");
    const eventType = String(body.eventType || "").toUpperCase();

    if (!badgeId) {
      return json(
        {
          success: false,
          error: "Badge ID is required",
        },
        { status: 400 }
      );
    }

    if (
      !["IMPRESSION", "CLICK", "CONVERSION"].includes(
        eventType
      )
    ) {
      return json(
        {
          success: false,
          error: "Invalid event type",
        },
        { status: 400 }
      );
    }

    const badge = await db.badge.findUnique({
      where: {
        id: badgeId,
      },
    });

    if (!badge) {
      return json(
        {
          success: false,
          error: "Badge not found",
        },
        { status: 404 }
      );
    }

    if (eventType === "IMPRESSION") {
      await db.$transaction([
        db.badge.update({
          where: {
            id: badgeId,
          },
          data: {
            impressions: {
              increment: 1,
            },
          },
        }),

        db.analyticsLog.create({
          data: {
            badgeId,
            eventType: "IMPRESSION",
          },
        }),
      ]);
    }

    if (eventType === "CLICK") {
      await db.$transaction([
        db.badge.update({
          where: {
            id: badgeId,
          },
          data: {
            clicks: {
              increment: 1,
            },
          },
        }),

        db.analyticsLog.create({
          data: {
            badgeId,
            eventType: "CLICK",
          },
        }),
      ]);
    }

    if (eventType === "CONVERSION") {
      await db.$transaction([
        db.badge.update({
          where: {
            id: badgeId,
          },
          data: {
            conversions: {
              increment: 1,
            },
          },
        }),

        db.analyticsLog.create({
          data: {
            badgeId,
            eventType: "CONVERSION",
          },
        }),
      ]);
    }

    return json({
      success: true,
    });
  } catch (error) {
    console.error("BADGES EVENT ERROR:", error);

    return json(
      {
        success: false,
        error: "Failed to record event",
      },
      { status: 500 }
    );
  }
}