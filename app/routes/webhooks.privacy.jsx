import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop } = await authenticate.webhook(request);
    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
      case "customers/data_request":
        break;
      case "CUSTOMERS_REDACT":
      case "customers/redact":
        break;
      case "SHOP_REDACT":
      case "shop/redact":
        if (shop) {
          await db.storeSetting.deleteMany({ where: { shop } });
        }
        break;
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response("Unauthorized", { status: 401 });
  }
};