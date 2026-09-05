import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, session } = await authenticate.webhook(request);
    if (session) {
      await db.session.deleteMany({ where: { shop } });
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response("Unauthorized", { status: 401 });
  }
};