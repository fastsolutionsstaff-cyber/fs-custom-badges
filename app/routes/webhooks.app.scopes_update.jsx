import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, session, payload } = await authenticate.webhook(request);
    if (topic === "APP_SCOPES_UPDATE" || topic === "app/scopes_update") {
      if (session && payload?.current) {
        await db.session.update({
          where: { id: session.id },
          data: { scope: payload.current.toString() },
        });
      }
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response("Unauthorized", { status: 401 });
  }
};