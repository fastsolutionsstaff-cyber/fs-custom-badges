
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function loader() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://ipwho.is/", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const data = await response.json();

    if (
      !response.ok ||
      data.success !== true ||
      !data.ip ||
      !data.connection?.asn ||
      !data.country_code
    ) {
      return json(
        {
          error: data.message || "IP or ASN lookup failed",
          details: {
            status: response.status,
          },
        },
        502
      );
    }

    return json({
      outboundIP: data.ip,
      asn: data.connection.asn,
      asnOrg: data.connection.org || null,
      isp: data.connection.isp || null,
      country: data.country,
      countryCode: data.country_code,
      city: data.city || null,
      source: "Vercel server function",
    });
  } catch (error) {
    return json(
      {
        error:
          error.name === "AbortError"
            ? "IP lookup timed out"
            : error.message || "IP lookup failed",
      },
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}
