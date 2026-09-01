import { useMemo, useState } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";

import {
  Page, Card, Tabs, TextField, Select, Checkbox, Button, BlockStack,
  InlineStack, Text, Box, Banner, Divider, Badge as PolarisBadge,
  RangeSlider, Grid, IndexTable, Modal, EmptyState, Tooltip,
} from "@shopify/polaris";
import { PlusIcon, EditIcon, DeleteIcon, DuplicateIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";

/* =========================================================
   HELPERS & PRESETS
========================================================= */
const DEFAULT_FORM = {
  id: "new", name: "", enabled: true, text: "LIMITED STOCK", icon: "⚡",
  bgColor: "#DC2626", textColor: "#FFFFFF", borderColor: "#991B1B",
  shape: "PILL", position: "TOP_LEFT", fontSize: 12, fontWeight: "bold",
  paddingX: 10, paddingY: 4, borderRadius: 20, priority: 10,
  targetType: "GLOBAL", targetTags: "", minInventory: 0, maxInventory: 9999,
  minPrice: 0, maxPrice: 99999, customCss: "", hideOnMobile: false,
  hideOnDesktop: false, startDate: "", endDate: "", productIds: [],
};

const PRESETS = {
  BLACK_FRIDAY: { text: "BLACK FRIDAY", icon: "🏷️", bgColor: "#000000", textColor: "#FFFFFF", borderColor: "#000000", shape: "RIBBON" },
  URGENCY: { text: "SELLING FAST", icon: "🔥", bgColor: "#FF3B30", textColor: "#FFFFFF", borderColor: "#FF3B30", shape: "FLOATING_GLOW" },
  MINIMAL: { text: "PREMIUM", icon: "✦", bgColor: "#FFFFFF", textColor: "#111827", borderColor: "#111827", shape: "OUTLINE" },
  ECO: { text: "100% ORGANIC", icon: "🌿", bgColor: "#34C759", textColor: "#FFFFFF", borderColor: "#34C759", shape: "GLASSMORPHISM" },
  HOT_SALE: { text: "HOT SALE", icon: "⚡", bgColor: "#FF9500", textColor: "#FFFFFF", borderColor: "#FF9500", shape: "SHARP" },
  BEST_SELLER: { text: "BEST SELLER", icon: "⭐", bgColor: "#007AFF", textColor: "#FFFFFF", borderColor: "#007AFF", shape: "PILL" },
};

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function badgeToForm(badge) {
  return {
    ...DEFAULT_FORM, ...badge, enabled: Boolean(badge.enabled),
    fontSize: Number(badge.fontSize ?? 12), paddingX: Number(badge.paddingX ?? 10),
    paddingY: Number(badge.paddingY ?? 4), borderRadius: Number(badge.borderRadius ?? 20),
    priority: Number(badge.priority ?? 0), minInventory: Number(badge.minInventory ?? 0),
    maxInventory: Number(badge.maxInventory ?? 9999), minPrice: Number(badge.minPrice ?? 0),
    maxPrice: Number(badge.maxPrice ?? 99999), hideOnMobile: Boolean(badge.hideOnMobile),
    hideOnDesktop: Boolean(badge.hideOnDesktop), startDate: toDateInputValue(badge.startDate),
    endDate: toDateInputValue(badge.endDate), productIds: Array.isArray(badge.productIds) ? badge.productIds : [],
  };
}

/* =========================================================
   LOADER & ACTIONS (Kept exactly same as your backend logic)
========================================================= */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  let settings = await db.appSettings.findUnique({ where: { shop } });
  if (!settings) settings = await db.appSettings.create({ data: { shop } });

  const badges = await db.badge.findMany({
    where: { shop }, include: { products: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const formattedBadges = badges.map((badge) => ({
    ...badge, productIds: badge.products ? badge.products.map((p) => p.productId) : [],
  }));

  const totalImpressions = formattedBadges.reduce((total, b) => total + Number(b.impressions || 0), 0);
  const totalClicks = formattedBadges.reduce((total, b) => total + Number(b.clicks || 0), 0);
  const totalConversions = formattedBadges.reduce((total, b) => total + Number(b.conversions || 0), 0);

  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : "0.00";

  return json({ shop, settings, badges: formattedBadges, analytics: { totalImpressions, totalClicks, totalConversions, avgCtr, conversionRate } });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "DELETE") {
    const id = String(formData.get("id") || "");
    const existing = await db.badge.findFirst({ where: { id, shop } });
    if (!existing) return json({ success: false, message: "Badge not found." }, { status: 404 });
    await db.badge.delete({ where: { id: existing.id } });
    return json({ success: true, message: "Badge campaign deleted." });
  }

  if (intent === "DUPLICATE") {
    const id = String(formData.get("id") || "");
    const existing = await db.badge.findFirst({ where: { id, shop } });
    if (!existing) return json({ success: false, message: "Badge not found." }, { status: 404 });
    
    await db.$transaction(async (tx) => {
      const duplicate = await tx.badge.create({
        data: {
          shop, name: `${existing.name} Copy`, enabled: false, priority: existing.priority || 0,
          text: existing.text || "", bgColor: existing.bgColor || "#111827", textColor: existing.textColor || "#FFFFFF",
          borderColor: existing.borderColor || "#000000", position: existing.position || "TOP_LEFT", shape: existing.shape || "PILL",
          icon: existing.icon || "", fontSize: existing.fontSize || 12, fontWeight: existing.fontWeight || "bold",
          paddingY: existing.paddingY || 4, paddingX: existing.paddingX || 10, borderRadius: existing.borderRadius || 20,
          customCss: existing.customCss || "", hideOnMobile: Boolean(existing.hideOnMobile), hideOnDesktop: Boolean(existing.hideOnDesktop),
          targetType: existing.targetType || "GLOBAL", targetTags: existing.targetTags || "", targetCollection: existing.targetCollection || "",
          minInventory: existing.minInventory || 0, maxInventory: existing.maxInventory || 9999,
          minPrice: existing.minPrice || 0, maxPrice: existing.maxPrice || 99999, startDate: existing.startDate, endDate: existing.endDate,
        },
      });
      const existingProducts = await tx.badgeProduct.findMany({ where: { badgeId: existing.id } });
      if (existingProducts.length > 0) {
        await tx.badgeProduct.createMany({
          data: existingProducts.map((p) => ({ badgeId: duplicate.id, productId: p.productId })),
        });
      }
    });
    return json({ success: true, message: "Badge campaign duplicated." });
  }

  if (intent === "SAVE_SETTINGS") {
    const globalCustomCss = String(formData.get("globalCustomCss") || "");
    await db.appSettings.update({ where: { shop }, data: { globalCustomCss } });
    return json({ success: true, message: "Global settings saved." });
  }

  const id = String(formData.get("id") || "");
  const payload = {
    shop,
    name: String(formData.get("name") || "").trim() || "Untitled Badge",
    enabled: formData.get("enabled") === "true",
    text: String(formData.get("text") || "BADGE").trim(),
    icon: String(formData.get("icon") || ""),
    bgColor: String(formData.get("bgColor") || "#111827"),
    textColor: String(formData.get("textColor") || "#FFFFFF"),
    borderColor: String(formData.get("borderColor") || "#000000"),
    position: String(formData.get("position") || "TOP_LEFT"),
    shape: String(formData.get("shape") || "PILL"),
    fontSize: parseInt(formData.get("fontSize") || "12", 10) || 12,
    fontWeight: String(formData.get("fontWeight") || "bold"),
    paddingX: parseInt(formData.get("paddingX") || "10", 10) || 10,
    paddingY: parseInt(formData.get("paddingY") || "4", 10) || 4,
    borderRadius: parseInt(formData.get("borderRadius") || "20", 10) || 20,
    priority: parseInt(formData.get("priority") || "0", 10) || 0,
    targetType: String(formData.get("targetType") || "GLOBAL"),
    targetTags: String(formData.get("targetTags") || ""),
    minInventory: parseInt(formData.get("minInventory") || "0", 10) || 0,
    maxInventory: parseInt(formData.get("maxInventory") || "9999", 10) || 9999,
    minPrice: parseFloat(formData.get("minPrice") || "0") || 0,
    maxPrice: parseFloat(formData.get("maxPrice") || "99999") || 99999,
    customCss: String(formData.get("customCss") || ""),
    hideOnMobile: formData.get("hideOnMobile") === "true",
    hideOnDesktop: formData.get("hideOnDesktop") === "true",
    startDate: formData.get("startDate") ? new Date(`${formData.get("startDate")}T00:00:00`) : null,
    endDate: formData.get("endDate") ? new Date(`${formData.get("endDate")}T23:59:59`) : null,
  };

  let productIds = [];
  try { productIds = JSON.parse(String(formData.get("productIds") || "[]")); } catch { productIds = []; }

  await db.$transaction(async (tx) => {
    let badge;
    if (id && id !== "new") {
      const existing = await tx.badge.findFirst({ where: { id, shop } });
      if (!existing) throw new Error("Not found.");
      badge = await tx.badge.update({ where: { id: existing.id }, data: payload });
    } else {
      badge = await tx.badge.create({ data: payload });
    }
    await tx.badgeProduct.deleteMany({ where: { badgeId: badge.id } });
    if (payload.targetType === "SPECIFIC_PRODUCTS" && productIds.length > 0) {
      await tx.badgeProduct.createMany({
        data: productIds.map((pId) => ({ badgeId: badge.id, productId: String(pId) })),
      });
    }
  });

  return json({ success: true, message: payload.enabled ? "Published." : "Saved as disabled." });
};

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function SaaSAdminApp() {
  const { settings, badges = [], analytics = {} } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedTab, setSelectedTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [globalCssState, setGlobalCssState] = useState(settings?.globalCustomCss || "");
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [previewTheme, setPreviewTheme] = useState("light");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isSaving = navigation.state === "submitting";

  const activeBadges = useMemo(() => badges.filter((b) => b.enabled), [badges]);
  const disabledBadges = useMemo(() => badges.filter((b) => !b.enabled), [badges]);

  const handleOpenModal = (badge = null) => {
    setFormData(badge ? badgeToForm(badge) : { ...DEFAULT_FORM, id: "new", name: `Campaign #${badges.length + 1}` });
    setShowAdvanced(false); setModalOpen(true);
  };

  const updateForm = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const handleApplyPreset = (presetKey) => setFormData((prev) => ({ ...prev, ...PRESETS[presetKey] }));

  const handleSaveForm = () => {
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (k === "productIds") data.append(k, JSON.stringify(v || []));
      else data.append(k, v === undefined || v === null ? "" : String(v));
    });
    submit(data, { method: "post" });
    setModalOpen(false);
  };

  const handleDuplicate = (id) => submit({ intent: "DUPLICATE", id }, { method: "post" });
  const handleDelete = (id) => {
    if (window.confirm("Delete permanently?")) submit({ intent: "DELETE", id }, { method: "post" });
  };
  const handleToggleBadge = (badge) => {
    const data = new FormData();
    Object.entries(badgeToForm(badge)).forEach(([k, v]) => {
      if (k === "productIds") data.append(k, JSON.stringify(v || []));
      else data.append(k, v == null ? "" : String(v));
    });
    data.set("enabled", badge.enabled ? "false" : "true");
    submit(data, { method: "post" });
  };
  const handleSaveSettings = () => submit({ intent: "SAVE_SETTINGS", globalCustomCss: globalCssState }, { method: "post" });

  const handleResourcePicker = async () => {
    if (!window.shopify?.resourcePicker) return window.alert("Picker not available.");
    const selected = await window.shopify.resourcePicker({
      type: "product", multiple: true, selectionIds: (formData.productIds || []).map((id) => ({ id })),
    });
    if (selected) updateForm("productIds", selected.map((p) => p.id));
  };

  /* Premium Live Preview Logic */
  const getPreviewStyles = (shape, bg, text, border, radius, padY, padX) => {
    let base = {
      display: "inline-flex", alignItems: "center", gap: "6px",
      fontSize: `${formData.fontSize}px`, fontWeight: formData.fontWeight,
      textTransform: "uppercase", letterSpacing: "0.5px", zIndex: 10,
      transition: "all 0.3s ease",
    };

    if (shape === "PILL" || shape === "SHARP") {
      return {
        ...base, background: bg, color: text, border: `1px solid ${border}`,
        borderRadius: shape === "PILL" ? "50px" : "0px",
        padding: `${padY}px ${padX}px`, boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      };
    }
    if (shape === "OUTLINE") {
      return {
        ...base, background: "transparent", color: bg, border: `2px solid ${bg}`,
        borderRadius: `${radius}px`, padding: `${padY}px ${padX}px`,
      };
    }
    if (shape === "GLASSMORPHISM") {
      return {
        ...base, background: `${bg}99`, color: text,
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        border: `1px solid rgba(255,255,255,0.2)`, borderRadius: `${radius}px`,
        padding: `${padY}px ${padX}px`, boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      };
    }
    if (shape === "RIBBON") {
      return {
        ...base, background: bg, color: text, border: "none",
        padding: `${padY}px ${padX + 10}px ${padY}px ${padX}px`,
        borderRadius: "0px", position: "relative",
        clipPath: "polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      };
    }
    if (shape === "FLOATING_GLOW") {
      return {
        ...base, background: bg, color: text, borderRadius: "50px", border: "none",
        padding: `${padY}px ${padX}px`, boxShadow: `0 0 15px 2px ${bg}80`,
      };
    }
    return base;
  };

  const previewBadgeStyle = getPreviewStyles(
    formData.shape, formData.bgColor, formData.textColor, formData.borderColor,
    formData.borderRadius, formData.paddingY, formData.paddingX
  );
  const safePosition = formData.position || "TOP_LEFT";

  return (
    <Page
      title="Badge Studio"
      subtitle="Create, control and optimize storefront product badges."
      primaryAction={{ content: "Create badge", icon: PlusIcon, onAction: () => handleOpenModal() }}
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner tone={actionData.success === false ? "critical" : "success"}>
            {actionData.message}
          </Banner>
        )}

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200"><Text variant="bodySm" tone="subdued">Active badges</Text><Text variant="headingXl">{activeBadges.length}</Text><PolarisBadge tone="success">Storefront ready</PolarisBadge></BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200"><Text variant="bodySm" tone="subdued">Total campaigns</Text><Text variant="headingXl">{badges.length}</Text><Text variant="bodySm" tone="subdued">{disabledBadges.length} disabled</Text></BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200"><Text variant="bodySm" tone="subdued">Impressions</Text><Text variant="headingXl">{Number(analytics.totalImpressions || 0).toLocaleString()}</Text><PolarisBadge tone="info">Storefront analytics</PolarisBadge></BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200"><Text variant="bodySm" tone="subdued">Average CTR</Text><Text variant="headingXl">{analytics.avgCtr || "0.00"}%</Text><PolarisBadge tone="attention">{Number(analytics.totalClicks || 0).toLocaleString()} clicks</PolarisBadge></BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Card padding="0">
          <Tabs tabs={[{ id: "campaigns", content: "Campaigns" }, { id: "analytics", content: "Analytics" }, { id: "settings", content: "Store settings" }]} selected={selectedTab} onSelect={setSelectedTab} />
          <Box padding="500">
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100"><Text variant="headingMd">Badge campaigns</Text><Text variant="bodySm" tone="subdued">Manage every badge displayed.</Text></BlockStack>
                  <Button variant="primary" icon={PlusIcon} onClick={() => handleOpenModal()}>Create badge</Button>
                </InlineStack>
                <Divider />
                {badges.length === 0 ? (
                  <EmptyState heading="Create your first badge" action={{ content: "Create badge", onAction: () => handleOpenModal() }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"><p>Create a product badge and publish it.</p></EmptyState>
                ) : (
                  <IndexTable resourceName={{ singular: "badge", plural: "badges" }} itemCount={badges.length} selectable={false} headings={[{ title: "Preview" }, { title: "Campaign" }, { title: "Status" }, { title: "Target" }, { title: "Priority" }, { title: "Performance" }, { title: "Actions" }]}>
                    {badges.map((badge, index) => {
                      const ctr = badge.impressions > 0 ? ((badge.clicks / badge.impressions) * 100).toFixed(2) : "0.00";
                      return (
                        <IndexTable.Row id={badge.id} key={badge.id} position={index}>
                          <IndexTable.Cell>
                             <div style={getPreviewStyles(badge.shape, badge.bgColor, badge.textColor, badge.borderColor, badge.borderRadius, 4, 10)}>
                               {badge.icon && <span>{badge.icon}</span>}
                               <span>{badge.text}</span>
                             </div>
                          </IndexTable.Cell>
                          <IndexTable.Cell><BlockStack gap="100"><Text variant="bodyMd" fontWeight="bold">{badge.name}</Text><Text variant="bodySm" tone="subdued">{badge.targetType}</Text></BlockStack></IndexTable.Cell>
                          <IndexTable.Cell><InlineStack gap="200"><PolarisBadge tone={badge.enabled ? "success" : "subdued"}>{badge.enabled ? "Live" : "Disabled"}</PolarisBadge><Button size="micro" onClick={() => handleToggleBadge(badge)}>{badge.enabled ? "Disable" : "Enable"}</Button></InlineStack></IndexTable.Cell>
                          <IndexTable.Cell><PolarisBadge tone="info">{badge.targetType === "GLOBAL" ? "Storewide" : badge.targetType.toLowerCase()}</PolarisBadge></IndexTable.Cell>
                          <IndexTable.Cell><PolarisBadge tone="attention">{badge.priority}</PolarisBadge></IndexTable.Cell>
                          <IndexTable.Cell><BlockStack gap="050"><Text variant="bodySm">{Number(badge.impressions || 0).toLocaleString()} views</Text><Text variant="bodySm" tone="subdued">{ctr}% CTR</Text></BlockStack></IndexTable.Cell>
                          <IndexTable.Cell><InlineStack gap="100"><Tooltip content="Edit"><Button icon={EditIcon} size="micro" onClick={() => handleOpenModal(badge)} /></Tooltip><Tooltip content="Duplicate"><Button icon={DuplicateIcon} size="micro" onClick={() => handleDuplicate(badge.id)} /></Tooltip><Tooltip content="Delete"><Button icon={DeleteIcon} tone="critical" size="micro" onClick={() => handleDelete(badge.id)} /></Tooltip></InlineStack></IndexTable.Cell>
                        </IndexTable.Row>
                      );
                    })}
                  </IndexTable>
                )}
              </BlockStack>
            )}
            
            {/* Keeping Analytics and Settings exactly same but ensuring functionality */}
            {selectedTab === 1 && (
              <BlockStack gap="500">
                <Text variant="headingLg">Conversion insights</Text>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}><Card padding="400"><Text tone="subdued">Impressions</Text><Text variant="headingLg">{analytics.totalImpressions}</Text></Card></Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}><Card padding="400"><Text tone="subdued">Clicks</Text><Text variant="headingLg">{analytics.totalClicks}</Text></Card></Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}><Card padding="400"><Text tone="subdued">CTR</Text><Text variant="headingLg">{analytics.avgCtr}%</Text></Card></Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3 }}><Card padding="400"><Text tone="subdued">Conversions</Text><Text variant="headingLg">{analytics.totalConversions}</Text></Card></Grid.Cell>
                </Grid>
              </BlockStack>
            )}

            {selectedTab === 2 && (
              <BlockStack gap="500">
                <Text variant="headingLg">Store settings</Text>
                <Card padding="500">
                  <BlockStack gap="400">
                    <Text variant="headingMd">Global custom CSS</Text>
                    <TextField value={globalCssState} onChange={setGlobalCssState} multiline={10} autoComplete="off" />
                    <InlineStack align="end"><Button variant="primary" loading={isSaving} onClick={handleSaveSettings}>Save settings</Button></InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            )}
          </Box>
        </Card>

        {/* MODAL / EDITOR */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={formData.id === "new" ? "Create campaign" : `Edit ${formData.name}`} primaryAction={{ content: formData.enabled ? "Save & publish" : "Save as disabled", onAction: handleSaveForm, loading: isSaving }} secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]} size="large">
          <Modal.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, sm: 7, md: 7, lg: 7, xl: 7 }}>
                <BlockStack gap="500">
                  <Card padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100"><Text variant="headingMd">Campaign status</Text></BlockStack>
                      <Checkbox label={formData.enabled ? "Enabled" : "Disabled"} checked={formData.enabled} onChange={(v) => updateForm("enabled", v)} />
                    </InlineStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Quick styles</Text>
                      <InlineStack gap="200" wrap>
                        <Button onClick={() => handleApplyPreset("BLACK_FRIDAY")}>Black Friday (Ribbon)</Button>
                        <Button onClick={() => handleApplyPreset("URGENCY")}>Urgency (Glow)</Button>
                        <Button onClick={() => handleApplyPreset("MINIMAL")}>Minimal</Button>
                        <Button onClick={() => handleApplyPreset("ECO")}>Eco (Glass)</Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Badge content</Text>
                      <TextField label="Campaign name" value={formData.name} onChange={(v) => updateForm("name", v)} autoComplete="off" />
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 8 }}><TextField label="Badge text" value={formData.text} onChange={(v) => updateForm("text", v)} autoComplete="off" /></Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Icon (Emoji)" value={formData.icon} onChange={(v) => updateForm("icon", v)} autoComplete="off" /></Grid.Cell>
                      </Grid>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Appearance</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Background" type="color" value={formData.bgColor} onChange={(v) => updateForm("bgColor", v)} /></Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Text" type="color" value={formData.textColor} onChange={(v) => updateForm("textColor", v)} /></Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Border" type="color" value={formData.borderColor} onChange={(v) => updateForm("borderColor", v)} /></Grid.Cell>
                      </Grid>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6 }}>
                          <Select label="Shape" options={[{ label: "Pill", value: "PILL" }, { label: "Sharp", value: "SHARP" }, { label: "Outline", value: "OUTLINE" }, { label: "Glassmorphism", value: "GLASSMORPHISM" }, { label: "Ribbon", value: "RIBBON" }, { label: "Floating glow", value: "FLOATING_GLOW" }]} value={formData.shape} onChange={(v) => updateForm("shape", v)} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6 }}>
                          <Select label="Position" options={[{ label: "Top left", value: "TOP_LEFT" }, { label: "Top right", value: "TOP_RIGHT" }, { label: "Bottom left", value: "BOTTOM_LEFT" }, { label: "Bottom right", value: "BOTTOM_RIGHT" }, { label: "Center overlay", value: "CENTER_OVERLAY" }]} value={formData.position} onChange={(v) => updateForm("position", v)} />
                        </Grid.Cell>
                      </Grid>
                      <RangeSlider label={`Font size: ${formData.fontSize}px`} value={formData.fontSize} min={8} max={24} onChange={(v) => updateForm("fontSize", v)} output />
                      <Select label="Font weight" options={[{ label: "Regular", value: "400" }, { label: "Medium", value: "500" }, { label: "Bold", value: "bold" }]} value={formData.fontWeight} onChange={(v) => updateForm("fontWeight", v)} />
                    </BlockStack>
                  </Card>
                  
                  {/* Kept targeting exactly same as original logic */}
                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Targeting</Text>
                      <Select label="Display condition" options={[{ label: "All products", value: "GLOBAL" }, { label: "Specific products", value: "SPECIFIC_PRODUCTS" }, { label: "Product tags", value: "PRODUCT_TAGS" }, { label: "Inventory level", value: "INVENTORY_LEVEL" }, { label: "Price range", value: "PRICE_RANGE" }]} value={formData.targetType} onChange={(v) => updateForm("targetType", v)} />
                      {formData.targetType === "SPECIFIC_PRODUCTS" && (
                        <Card background="bg-surface-secondary" padding="300">
                          <InlineStack align="space-between" blockAlign="center"><Text>{(formData.productIds || []).length} products selected</Text><Button onClick={handleResourcePicker}>Choose products</Button></InlineStack>
                        </Card>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              </Grid.Cell>

              {/* LIVE PREVIEW ENGINE (Perfected for premium views) */}
              <Grid.Cell columnSpan={{ xs: 12, sm: 5, md: 5, lg: 5, xl: 5 }}>
                <Box style={{ position: "sticky", top: "16px" }}>
                  <Card padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between"><Text variant="headingMd">Live preview</Text></InlineStack>
                      <Box padding="600" borderRadius="300" style={{ minHeight: "320px", background: "#f3f4f6", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <div style={{ width: "230px", height: "280px", background: "#ffffff", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
                          <div style={{ height: "175px", background: "#e5e7eb", position: "relative", overflow: "hidden" }}>
                            <div style={{
                              position: "absolute",
                              ...(safePosition.includes("TOP") ? { top: "10px" } : { bottom: "10px" }),
                              ...(safePosition.includes("LEFT") ? { left: "10px" } : safePosition.includes("RIGHT") ? { right: "10px" } : { left: "50%", transform: "translateX(-50%)" }),
                              ...(safePosition.includes("LEFT") && formData.shape === "RIBBON" ? { left: "0px" } : {}), // Flush left for ribbon
                            }}>
                              <div style={previewBadgeStyle}>
                                {formData.icon && <span>{formData.icon}</span>}
                                <span>{formData.text || "BADGE"}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: "14px" }}><div style={{ height: "10px", width: "75%", background: "#d1d5db", marginBottom: "9px" }} /><div style={{ height: "13px", width: "45%", background: "#111827" }} /></div>
                        </div>
                      </Box>
                    </BlockStack>
                  </Card>
                </Box>
              </Grid.Cell>
            </Grid>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}