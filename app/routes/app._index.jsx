import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Tabs,
  TextField,
  Select,
  Checkbox,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Banner,
  Divider,
  Badge as PolarisBadge,
  RangeSlider,
  Grid,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let existingBadges = await db.badge.findMany({
    where: { shop },
    include: { products: true },
    orderBy: { badgeIndex: "asc" },
  });

  if (existingBadges.length < 3) {
    const defaults = [
      { badgeIndex: 1, text: "BESTSELLER", bgColor: "#D97706", textColor: "#FFFFFF", position: "top-left", fontSize: 11, icon: "🔥", shape: "pill" },
      { badgeIndex: 2, text: "HOT ITEM", bgColor: "#DC2626", textColor: "#FFFFFF", position: "top-right", fontSize: 11, icon: "⭐", shape: "pill" },
      { badgeIndex: 3, text: "LIMITED STOCK", bgColor: "#111827", textColor: "#FFFFFF", position: "bottom-left", fontSize: 11, icon: "⚡", shape: "pill" },
    ];

    for (const def of defaults) {
      if (!existingBadges.some((b) => b.badgeIndex === def.badgeIndex)) {
        await db.badge.create({
          data: { shop, ...def, enabled: true, isGlobal: false },
        });
      }
    }

    existingBadges = await db.badge.findMany({
      where: { shop },
      include: { products: true },
      orderBy: { badgeIndex: "asc" },
    });
  }

  const badgesMap = existingBadges.map((b) => ({
    id: b.id,
    badgeIndex: b.badgeIndex,
    enabled: b.enabled,
    text: b.text,
    bgColor: b.bgColor || "#D97706",
    textColor: b.textColor || "#FFFFFF",
    position: b.position || "top-left",
    shape: b.shape || "pill",
    icon: b.icon || "",
    fontSize: b.fontSize || 11,
    impressions: b.impressions || 0,
    clicks: b.clicks || 0,
    isGlobal: b.isGlobal,
    productIds: b.products.map((p) => p.productId),
  }));

  const totalImpressions = badgesMap.reduce((acc, b) => acc + b.impressions, 0);
  const totalClicks = badgesMap.reduce((acc, b) => acc + b.clicks, 0);
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  return json({ shop, badges: badgesMap, analytics: { totalImpressions, totalClicks, overallCTR } });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const badgeIndex = parseInt(formData.get("badgeIndex"), 10);
  const enabled = formData.get("enabled") === "true";
  const text = formData.get("text") || "BADGE";
  const bgColor = formData.get("bgColor") || "#000000";
  const textColor = formData.get("textColor") || "#FFFFFF";
  const position = formData.get("position") || "top-left";
  const isGlobal = formData.get("isGlobal") === "true";
  const fontSize = parseInt(formData.get("fontSize") || "11", 10);
  const icon = formData.get("icon") || "";
  const shape = formData.get("shape") || "pill";
  const productIdsRaw = formData.get("productIds");
  const productIds = productIdsRaw ? JSON.parse(productIdsRaw) : [];

  await db.$transaction(async (tx) => {
    const badge = await tx.badge.upsert({
      where: { shop_badgeIndex: { shop, badgeIndex } },
      update: { enabled, text, bgColor, textColor, position, isGlobal, fontSize, icon, shape },
      create: { shop, badgeIndex, enabled, text, bgColor, textColor, position, isGlobal, fontSize, icon, shape },
    });

    await tx.badgeProduct.deleteMany({ where: { badgeId: badge.id } });
    if (!isGlobal && productIds.length > 0) {
      await tx.badgeProduct.createMany({
        data: productIds.map((pId) => ({ badgeId: badge.id, productId: pId })),
      });
    }
  });

  return json({ success: true });
};

export default function AppDashboard() {
  const { shop, badges: initialBadges, analytics } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [mainTab, setMainTab] = useState(0);
  const [selectedBadgeTab, setSelectedBadgeTab] = useState(0);
  const [badges, setBadges] = useState(initialBadges);

  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [previewBg, setPreviewBg] = useState("light");
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    setBadges(initialBadges);
  }, [initialBadges]);

  const activeBadge = badges[selectedBadgeTab] || badges[0];

  const updateActiveBadge = (field, value) => {
    const updated = [...badges];
    updated[selectedBadgeTab] = { ...updated[selectedBadgeTab], [field]: value };
    setBadges(updated);
  };

  const handleSelectProducts = async () => {
  if (typeof window !== "undefined" && window.shopify?.resourcePicker) {
    const selected = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: activeBadge.productIds.map((id) => ({ id })),
    });

    if (selected) {
      console.log("SELECTED PRODUCTS FROM SHOPIFY:", selected);

      const ids = selected.map((product) => {
        // Shopify Resource Picker normally returns the product GID.
        // Keep the GID because this is the actual Shopify product ID.
        return product.id;
      });

      console.log("SAVED PRODUCT IDS:", ids);

      updateActiveBadge("productIds", ids);
    }
  }
};

  const handleSave = () => {
    const data = new FormData();
    data.append("badgeIndex", activeBadge.badgeIndex.toString());
    data.append("enabled", activeBadge.enabled.toString());
    data.append("text", activeBadge.text);
    data.append("bgColor", activeBadge.bgColor);
    data.append("textColor", activeBadge.textColor);
    data.append("position", activeBadge.position);
    data.append("isGlobal", activeBadge.isGlobal.toString());
    data.append("fontSize", activeBadge.fontSize.toString());
    data.append("icon", activeBadge.icon || "");
    data.append("shape", activeBadge.shape || "pill");
    data.append("productIds", JSON.stringify(activeBadge.productIds));

    submit(data, { method: "post" });
    setSavedBanner(true);
  };

  const badgeTabs = [
    { id: "b1", content: "Badge #1 (Bestsellers)" },
    { id: "b2", content: "Badge #2 (Hot Deals)" },
    { id: "b3", content: "Badge #3 (Limited Stock)" },
  ];

  const mainNavTabs = [
    { id: "builder", content: "Badge Customizer & Rules" },
    { id: "analytics", content: "Analytics & CTR" },
    { id: "integration", content: "Theme Setup & App Embed" },
  ];

  const getPositionStyles = (pos) => {
    switch (pos) {
      case "top-left": return { top: "12px", left: "12px" };
      case "top-right": return { top: "12px", right: "12px" };
      case "bottom-left": return { bottom: "12px", left: "12px" };
      case "bottom-right": return { bottom: "12px", right: "12px" };
      case "overlay": return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
      default: return { top: "12px", left: "12px" };
    }
  };

  const getShapeStyles = (shape) => {
    switch (shape) {
      case "pill": return { borderRadius: "20px", padding: "4px 12px", border: "none" };
      case "sharp": return { borderRadius: "0px", padding: "5px 10px", border: "none" };
      case "ribbon": return { borderRadius: "0 8px 8px 0", padding: "4px 10px", border: "none" };
      case "outline": return { borderRadius: "6px", padding: "4px 10px", border: `2px solid ${activeBadge.bgColor}`, backgroundColor: "transparent" };
      default: return { borderRadius: "20px", padding: "4px 12px", border: "none" };
    }
  };

  return (
    <Page
      title="Custom Badges Pro"
      subtitle="Boost store conversions with eye-catching, dynamic product badges."
      primaryAction={{
        content: "Save Badge Changes",
        onAction: handleSave,
        loading: navigation.state === "submitting",
      }}
    >
      <BlockStack gap="500">
        {savedBanner && (
          <Banner title="Badge settings saved successfully!" tone="success" onDismiss={() => setSavedBanner(false)}>
            <p>Changes will reflect on your live store storefront automatically.</p>
          </Banner>
        )}

        <Tabs tabs={mainNavTabs} selected={mainTab} onSelect={setMainTab}>
          <Box paddingBlockStart="400">
            {mainTab === 0 && (
              <Layout>
                <Layout.Section>
                  <BlockStack gap="400">
                    <Card padding="0">
                      <Tabs tabs={badgeTabs} selected={selectedBadgeTab} onSelect={setSelectedBadgeTab} />
                    </Card>

                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h2" variant="headingMd">General Configuration</Text>
                          <InlineStack gap="200" blockAlign="center">
                            <PolarisBadge tone={activeBadge.enabled ? "success" : "critical"}>
                              {activeBadge.enabled ? "Active" : "Disabled"}
                            </PolarisBadge>
                            <Checkbox
                              label="Enable Badge"
                              checked={activeBadge.enabled}
                              onChange={(val) => updateActiveBadge("enabled", val)}
                            />
                          </InlineStack>
                        </InlineStack>

                        <Divider />

                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <TextField
                              label="Badge Display Text"
                              value={activeBadge.text}
                              onChange={(val) => updateActiveBadge("text", val)}
                              autoComplete="off"
                              placeholder="e.g. 20% OFF, BESTSELLER"
                            />
                          </Grid.Cell>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <Select
                              label="Icon Prefix"
                              options={[
                                { label: "None", value: "" },
                                { label: "🔥 Fire", value: "🔥" },
                                { label: "⭐ Star", value: "⭐" },
                                { label: "⚡ Bolt", value: "⚡" },
                                { label: "🏷️ Tag", value: "🏷️" },
                                { label: "🎁 Gift", value: "🎁" },
                              ]}
                              value={activeBadge.icon}
                              onChange={(val) => updateActiveBadge("icon", val)}
                            />
                          </Grid.Cell>
                        </Grid>

                        <InlineStack gap="600" align="start">
                          <Box width="140px">
                            <TextField
                              label="Background Color"
                              value={activeBadge.bgColor}
                              onChange={(val) => updateActiveBadge("bgColor", val)}
                              autoComplete="off"
                              type="color"
                            />
                          </Box>
                          <Box width="140px">
                            <TextField
                              label="Text Color"
                              value={activeBadge.textColor}
                              onChange={(val) => updateActiveBadge("textColor", val)}
                              autoComplete="off"
                              type="color"
                            />
                          </Box>
                        </InlineStack>

                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <Select
                              label="Badge Shape Style"
                              options={[
                                { label: "Rounded Pill", value: "pill" },
                                { label: "Sharp Square", value: "sharp" },
                                { label: "Ribbon Edge", value: "ribbon" },
                                { label: "Subtle Outline", value: "outline" },
                              ]}
                              value={activeBadge.shape}
                              onChange={(val) => updateActiveBadge("shape", val)}
                            />
                          </Grid.Cell>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <Select
                              label="Display Position"
                              options={[
                                { label: "Top Left", value: "top-left" },
                                { label: "Top Right", value: "top-right" },
                                { label: "Bottom Left", value: "bottom-left" },
                                { label: "Bottom Right", value: "bottom-right" },
                                { label: "Center Overlay", value: "overlay" },
                              ]}
                              value={activeBadge.position}
                              onChange={(val) => updateActiveBadge("position", val)}
                            />
                          </Grid.Cell>
                        </Grid>

                        <RangeSlider
                          label={`Font Size: ${activeBadge.fontSize}px`}
                          value={activeBadge.fontSize}
                          onChange={(val) => updateActiveBadge("fontSize", val)}
                          min={9}
                          max={18}
                          output
                        />

                        <Divider />

                        <Text as="h3" variant="headingSm">Product Targeting & Rules</Text>
                        <Checkbox
                          label="Apply globally to ALL store products"
                          checked={activeBadge.isGlobal}
                          onChange={(val) => updateActiveBadge("isGlobal", val)}
                        />

                        {!activeBadge.isGlobal && (
                          <Card background="bg-surface-secondary">
                            <BlockStack gap="300">
                              <Text as="p" variant="bodyMd">Target specific products for this badge:</Text>
                              <InlineStack gap="300" blockAlign="center">
                                <Button onClick={handleSelectProducts} variant="secondary">
                                  Select Specific Products
                                </Button>
                                <Text as="span" variant="bodyMd" tone="subdued">
                                  {activeBadge.productIds.length} product(s) attached
                                </Text>
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        )}

                        <Box paddingBlockStart="300">
                          <Button variant="primary" size="large" onClick={handleSave} loading={navigation.state === "submitting"}>
                            Save & Publish
                          </Button>
                        </Box>
                      </BlockStack>
                    </Card>
                  </BlockStack>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                  <Box style={{ position: "sticky", top: "20px" }}>
                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h2" variant="headingMd">Live Storefront Preview</Text>
                          <PolarisBadge tone="attention">Interactive</PolarisBadge>
                        </InlineStack>

                        <InlineStack align="space-between">
                          <InlineStack gap="100">
                            <Button pressed={previewViewport === "desktop"} onClick={() => setPreviewViewport("desktop")} size="micro">
                              Desktop
                            </Button>
                            <Button pressed={previewViewport === "mobile"} onClick={() => setPreviewViewport("mobile")} size="micro">
                              Mobile
                            </Button>
                          </InlineStack>
                          <InlineStack gap="100">
                            <Button pressed={previewBg === "light"} onClick={() => setPreviewBg("light")} size="micro">
                              Light
                            </Button>
                            <Button pressed={previewBg === "dark"} onClick={() => setPreviewBg("dark")} size="micro">
                              Dark
                            </Button>
                          </InlineStack>
                        </InlineStack>

                        <Box
                          padding="400"
                          borderRadius="300"
                          style={{
                            backgroundColor: previewBg === "light" ? "#F1F5F9" : "#0F172A",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "320px",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <div
                            style={{
                              width: previewViewport === "desktop" ? "100%" : "180px",
                              maxWidth: "240px",
                              backgroundColor: previewBg === "light" ? "#FFFFFF" : "#1E293B",
                              borderRadius: "12px",
                              border: previewBg === "light" ? "1px solid #E2E8F0" : "1px solid #334155",
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                              overflow: "hidden",
                              position: "relative",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <div
                              style={{
                                position: "relative",
                                width: "100%",
                                height: "180px",
                                backgroundColor: previewBg === "light" ? "#F8FAFC" : "#334155",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={previewBg === "light" ? "#94A3B8" : "#64748B"} strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>

                              {activeBadge.enabled && (
                                <div
                                  style={{
                                    position: "absolute",
                                    backgroundColor: activeBadge.shape === "outline" ? "transparent" : activeBadge.bgColor,
                                    color: activeBadge.shape === "outline" ? activeBadge.bgColor : activeBadge.textColor,
                                    fontSize: `${activeBadge.fontSize}px`,
                                    fontWeight: "700",
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                    zIndex: 10,
                                    boxShadow: activeBadge.shape === "outline" ? "none" : "0 4px 6px -1px rgba(0,0,0,0.15)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    lineHeight: "1",
                                    ...getShapeStyles(activeBadge.shape),
                                    ...getPositionStyles(activeBadge.position),
                                  }}
                                >
                                  {activeBadge.icon && <span>{activeBadge.icon}</span>}
                                  <span>{activeBadge.text || "BADGE"}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ padding: "12px" }}>
                              <div style={{ height: "12px", width: "75%", backgroundColor: previewBg === "light" ? "#CBD5E1" : "#475569", borderRadius: "4px", marginBottom: "8px" }} />
                              <div style={{ height: "14px", width: "40%", backgroundColor: previewBg === "light" ? "#0F172A" : "#F8FAFC", borderRadius: "4px" }} />
                            </div>
                          </div>
                        </Box>

                        <Banner tone="info">
                          <p>Badges automatically inherit your theme fonts and center alignment on product grids.</p>
                        </Banner>
                      </BlockStack>
                    </Card>
                  </Box>
                </Layout.Section>
              </Layout>
            )}

            {mainTab === 1 && (
              <Layout>
                <Layout.Section>
                  <BlockStack gap="400">
                    <Grid>
                      <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                        <Card>
                          <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">Total Badge Impressions</Text>
                            <Text as="h2" variant="headingLg">{analytics.totalImpressions}</Text>
                            <PolarisBadge tone="success">Real Store View Count</PolarisBadge>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                        <Card>
                          <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">Product Clicks</Text>
                            <Text as="h2" variant="headingLg">{analytics.totalClicks}</Text>
                            <PolarisBadge tone="highlight">Total Interactions</PolarisBadge>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                        <Card>
                          <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">Click-Through Rate (CTR)</Text>
                            <Text as="h2" variant="headingLg">{analytics.overallCTR}%</Text>
                            <PolarisBadge tone="info">Live Conversion Ratio</PolarisBadge>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>
                    </Grid>

                    <Card>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingMd">Individual Badge Performance</Text>
                        <Divider />
                        <BlockStack gap="400">
                          {badges.map((b) => {
                            const badgeCtr = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(1) : "0.0";
                            return (
                              <BlockStack key={b.id} gap="100">
                                <InlineStack align="space-between">
                                  <Text as="span" fontWeight="bold">{b.icon ? `${b.icon} ` : ""}{b.text}</Text>
                                  <Text as="span" tone="subdued">{b.impressions} Views | {b.clicks} Clicks ({badgeCtr}% CTR)</Text>
                                </InlineStack>
                                <ProgressBar progress={Math.min(b.impressions, 100)} tone="primary" />
                              </BlockStack>
                            );
                          })}
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  </BlockStack>
                </Layout.Section>
              </Layout>
            )}

            {mainTab === 2 && (
              <Layout>
                <Layout.Section>
                  <Card>
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingMd">Storefront Theme Activation</Text>
                      <p>To render active badges on your live Shopify store without modifying Liquid files, enable the App Embed block in your Theme Editor:</p>
                      
                      <Divider />

                      <BlockStack gap="300">
                        <Text as="h3" variant="headingSm">Step 1: Open Theme Editor</Text>
                        <p>Click the button below to open your store's live Theme Customizer (opens in new tab to avoid iframe blocks):</p>
                        
                        <Button
                          url={`https://${shop}/admin/themes/current/editor?context=apps`}
                          target="_top"
                          variant="primary"
                        >
                          Open Shopify Theme Editor
                        </Button>

                        <Text as="h3" variant="headingSm">Step 2: Enable "Custom Badges Embed"</Text>
                        <p>In the left sidebar, click <strong>App Embeds</strong> and toggle on <strong>Custom Badges Embed</strong>.</p>

                        <Text as="h3" variant="headingSm">Step 3: Save Changes</Text>
                        <p>Click <strong>Save</strong> in the top-right corner of your Theme Editor.</p>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              </Layout>
            )}
          </Box>
        </Tabs>
      </BlockStack>
    </Page>
  );
}