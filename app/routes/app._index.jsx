import { useMemo, useState } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";

import {
  Page,
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
  IndexTable,
  Modal,
  EmptyState,
  Tooltip,
} from "@shopify/polaris";

import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";

const DEFAULT_FORM = {
  id: "new",
  name: "",
  enabled: true,
  text: "LIMITED STOCK",
  icon: "⚡",
  bgColor: "#111827",
  textColor: "#FFFFFF",
  borderColor: "#374151",
  shape: "PILL",
  position: "TOP_LEFT",
  fontSize: 12,
  fontWeight: "bold",
  paddingX: 14,
  paddingY: 6,
  borderRadius: 25,
  priority: 10,
  targetType: "GLOBAL",
  targetTags: "",
  minInventory: 0,
  maxInventory: 9999,
  minPrice: 0,
  maxPrice: 99999,
  customCss: "",
  hideOnMobile: false,
  hideOnDesktop: false,
  startDate: "",
  endDate: "",
  productIds: [],
};

const PRESETS = {
  BLACK_FRIDAY: {
    text: "BLACK FRIDAY",
    icon: "🔥",
    bgColor: "#000000",
    textColor: "#FFFFFF",
    borderColor: "#E11D48",
    shape: "PILL",
  },
  URGENCY: {
    text: "LIMITED STOCK",
    icon: "⚡",
    bgColor: "#1E1B4B",
    textColor: "#93C5FD",
    borderColor: "#3B82F6",
    shape: "PILL",
  },
  MINIMAL: {
    text: "BEST SELLER",
    icon: "⭐",
    bgColor: "#111827",
    textColor: "#FACC15",
    borderColor: "#CA8A04",
    shape: "PILL",
  },
  ECO: {
    text: "100% ORGANIC",
    icon: "🌿",
    bgColor: "#064E3B",
    textColor: "#A7F3D0",
    borderColor: "#059669",
    shape: "PILL",
  },
  HOT_SALE: {
    text: "HOT SALE",
    icon: "🔥",
    bgColor: "#991B1B",
    textColor: "#FEE2E2",
    borderColor: "#EF4444",
    shape: "PILL",
  },
};

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function badgeToForm(badge) {
  return {
    ...DEFAULT_FORM,
    ...badge,
    enabled: Boolean(badge.enabled),
    fontSize: Number(badge.fontSize ?? 12),
    paddingX: Number(badge.paddingX ?? 14),
    paddingY: Number(badge.paddingY ?? 6),
    borderRadius: Number(badge.borderRadius ?? 25),
    priority: Number(badge.priority ?? 0),
    minInventory: Number(badge.minInventory ?? 0),
    maxInventory: Number(badge.maxInventory ?? 9999),
    minPrice: Number(badge.minPrice ?? 0),
    maxPrice: Number(badge.maxPrice ?? 99999),
    hideOnMobile: Boolean(badge.hideOnMobile),
    hideOnDesktop: Boolean(badge.hideOnDesktop),
    startDate: toDateInputValue(badge.startDate),
    endDate: toDateInputValue(badge.endDate),
    productIds: Array.isArray(badge.productIds) ? badge.productIds : [],
  };
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.appSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await db.appSettings.create({ data: { shop } });
  }

  const badges = await db.badge.findMany({
    where: { shop },
    include: { products: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const formattedBadges = badges.map((badge) => ({
    ...badge,
    productIds: badge.products ? badge.products.map((p) => p.productId) : [],
  }));

  const totalImpressions = formattedBadges.reduce((t, b) => t + Number(b.impressions || 0), 0);
  const totalClicks = formattedBadges.reduce((t, b) => t + Number(b.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  return json({
    shop,
    settings,
    badges: formattedBadges,
    analytics: { totalImpressions, totalClicks, avgCtr },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "DELETE") {
    const id = String(formData.get("id") || "");
    await db.badge.deleteMany({ where: { id, shop } });
    return json({ success: true, message: "Badge campaign deleted successfully." });
  }

  if (intent === "DUPLICATE") {
    const id = String(formData.get("id") || "");
    const existing = await db.badge.findFirst({ where: { id, shop }, include: { products: true } });
    if (!existing) return json({ success: false, message: "Badge not found." }, { status: 404 });

    await db.$transaction(async (tx) => {
      const duplicate = await tx.badge.create({
        data: {
          shop,
          name: `${existing.name} (Copy)`,
          enabled: false,
          priority: existing.priority,
          text: existing.text,
          bgColor: existing.bgColor,
          textColor: existing.textColor,
          borderColor: existing.borderColor,
          position: existing.position,
          shape: existing.shape,
          icon: existing.icon,
          fontSize: existing.fontSize,
          fontWeight: existing.fontWeight,
          paddingY: existing.paddingY,
          paddingX: existing.paddingX,
          borderRadius: existing.borderRadius,
          customCss: existing.customCss,
          hideOnMobile: existing.hideOnMobile,
          hideOnDesktop: existing.hideOnDesktop,
          targetType: existing.targetType,
          targetTags: existing.targetTags,
          minInventory: existing.minInventory,
          maxInventory: existing.maxInventory,
          minPrice: existing.minPrice,
          maxPrice: existing.maxPrice,
          startDate: existing.startDate,
          endDate: existing.endDate,
        },
      });

      if (existing.products?.length > 0) {
        await tx.badgeProduct.createMany({
          data: existing.products.map((p) => ({ badgeId: duplicate.id, productId: p.productId })),
        });
      }
    });

    return json({ success: true, message: "Badge duplicated successfully." });
  }

  if (intent === "SAVE_SETTINGS") {
    const globalCustomCss = String(formData.get("globalCustomCss") || "");
    await db.appSettings.update({ where: { shop }, data: { globalCustomCss } });
    return json({ success: true, message: "Settings saved successfully." });
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim() || "Pro Badge Campaign";
  const enabled = formData.get("enabled") === "true";
  const text = String(formData.get("text") || "BADGE").trim();
  const icon = String(formData.get("icon") || "");
  const bgColor = String(formData.get("bgColor") || "#111827");
  const textColor = String(formData.get("textColor") || "#FFFFFF");
  const borderColor = String(formData.get("borderColor") || "#374151");
  const position = String(formData.get("position") || "TOP_LEFT");
  const shape = String(formData.get("shape") || "PILL");
  const fontSize = parseInt(formData.get("fontSize") || "12", 10);
  const fontWeight = String(formData.get("fontWeight") || "bold");
  const paddingX = parseInt(formData.get("paddingX") || "14", 10);
  const paddingY = parseInt(formData.get("paddingY") || "6", 10);
  const borderRadius = parseInt(formData.get("borderRadius") || "25", 10);
  const priority = parseInt(formData.get("priority") || "0", 10);
  const targetType = String(formData.get("targetType") || "GLOBAL");
  const targetTags = String(formData.get("targetTags") || "");
  const minInventory = parseInt(formData.get("minInventory") || "0", 10);
  const maxInventory = parseInt(formData.get("maxInventory") || "9999", 10);
  const minPrice = parseFloat(formData.get("minPrice") || "0");
  const maxPrice = parseFloat(formData.get("maxPrice") || "99999");
  const customCss = String(formData.get("customCss") || "");
  const hideOnMobile = formData.get("hideOnMobile") === "true";
  const hideOnDesktop = formData.get("hideOnDesktop") === "true";
  const startDateRaw = String(formData.get("startDate") || "");
  const endDateRaw = String(formData.get("endDate") || "");
  const startDate = startDateRaw ? new Date(`${startDateRaw}T00:00:00`) : null;
  const endDate = endDateRaw ? new Date(`${endDateRaw}T23:59:59`) : null;

  let productIds = [];
  try {
    productIds = JSON.parse(String(formData.get("productIds") || "[]"));
  } catch {
    productIds = [];
  }

  const payload = {
    shop,
    name,
    enabled,
    priority,
    text,
    bgColor,
    textColor,
    borderColor,
    position,
    shape,
    icon,
    fontSize,
    fontWeight,
    paddingY,
    paddingX,
    borderRadius,
    customCss,
    hideOnMobile,
    hideOnDesktop,
    targetType,
    targetTags,
    minInventory,
    maxInventory,
    minPrice,
    maxPrice,
    startDate,
    endDate,
  };

  await db.$transaction(async (tx) => {
    let badge;
    if (id && id !== "new") {
      badge = await tx.badge.update({ where: { id }, data: payload });
    } else {
      badge = await tx.badge.create({ data: payload });
    }

    await tx.badgeProduct.deleteMany({ where: { badgeId: badge.id } });
    if (targetType === "SPECIFIC_PRODUCTS" && productIds.length > 0) {
      await tx.badgeProduct.createMany({
        data: productIds.map((pid) => ({ badgeId: badge.id, productId: String(pid) })),
      });
    }
  });

  return json({ success: true, message: "Badge configuration saved successfully." });
};

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
    if (badge) {
      setFormData(badgeToForm(badge));
    } else {
      setFormData({ ...DEFAULT_FORM, id: "new", name: `Pro Campaign #${badges.length + 1}` });
    }
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const updateForm = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const handleApplyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) setFormData((prev) => ({ ...prev, ...preset }));
  };

  const handleSaveForm = () => {
    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      data.append(k, k === "productIds" ? JSON.stringify(v || []) : v ?? "");
    });
    submit(data, { method: "post" });
    setModalOpen(false);
  };

  const handleDuplicate = (id) => submit({ intent: "DUPLICATE", id }, { method: "post" });
  const handleDelete = (id) => {
    if (window.confirm("Delete this campaign permanently?")) {
      submit({ intent: "DELETE", id }, { method: "post" });
    }
  };

  const handleToggleBadge = (badge) => {
    const data = new FormData();
    Object.entries(badgeToForm(badge)).forEach(([k, v]) => {
      data.append(k, k === "productIds" ? JSON.stringify(v || []) : v ?? "");
    });
    data.set("enabled", badge.enabled ? "false" : "true");
    submit(data, { method: "post" });
  };

  const handleResourcePicker = async () => {
    if (!window.shopify?.resourcePicker) return alert("Resource Picker unavailable.");
    const selected = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: (formData.productIds || []).map((id) => ({ id })),
    });
    if (selected) setFormData((prev) => ({ ...prev, productIds: selected.map((p) => p.id) }));
  };

  const previewBadgeStyle = {
    background: formData.shape === "OUTLINE" ? "transparent" : formData.bgColor,
    color: formData.shape === "OUTLINE" ? formData.bgColor : formData.textColor,
    border: `1.5px solid ${formData.borderColor || formData.bgColor}`,
    borderRadius: formData.shape === "PILL" ? "999px" : `${formData.borderRadius}px`,
    padding: `${formData.paddingY}px ${formData.paddingX}px`,
    fontSize: `${formData.fontSize}px`,
    fontWeight: formData.fontWeight,
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    textTransform: "uppercase",
  };

  return (
    <Page
      title="Badge Studio Pro"
      subtitle="Create high-converting professional product badges & labels."
      primaryAction={{ content: "Create badge", icon: PlusIcon, onAction: () => handleOpenModal() }}
    >
      <BlockStack gap="500">
        {actionData?.message && <Banner tone={actionData.success === false ? "critical" : "success"}>{actionData.message}</Banner>}

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Active Badges</Text>
                <Text variant="headingXl">{activeBadges.length}</Text>
                <PolarisBadge tone="success">Storefront Optimized</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Total Campaigns</Text>
                <Text variant="headingXl">{badges.length}</Text>
                <Text variant="bodySm" tone="subdued">{disabledBadges.length} disabled</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Total Impressions</Text>
                <Text variant="headingXl">{Number(analytics.totalImpressions || 0).toLocaleString()}</Text>
                <PolarisBadge tone="info">Live Analytics</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Average CTR</Text>
                <Text variant="headingXl">{analytics.avgCtr || "0.00"}%</Text>
                <PolarisBadge tone="attention">{Number(analytics.totalClicks || 0).toLocaleString()} clicks</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Card padding="0">
          <Tabs
            tabs={[{ id: "campaigns", content: "Campaigns" }, { id: "analytics", content: "Analytics" }, { id: "settings", content: "Settings" }]}
            selected={selectedTab}
            onSelect={setSelectedTab}
          />
          <Box padding="500">
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd">Active Badge Campaigns</Text>
                    <Text variant="bodySm" tone="subdued">Manage your high-converting product grid badges.</Text>
                  </BlockStack>
                  <Button variant="primary" icon={PlusIcon} onClick={() => handleOpenModal()}>Create badge</Button>
                </InlineStack>
                <Divider />
                {badges.length === 0 ? (
                  <EmptyState heading="No badges created yet" action={{ content: "Create badge", onAction: () => handleOpenModal() }} image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                    <p>Get started by creating your first professional storefront badge.</p>
                  </EmptyState>
                ) : (
                  <IndexTable
                    resourceName={{ singular: "badge", plural: "badges" }}
                    itemCount={badges.length}
                    selectable={false}
                    headings={[{ title: "Preview" }, { title: "Campaign Name" }, { title: "Status" }, { title: "Target" }, { title: "Priority" }, { title: "Performance" }, { title: "Actions" }]}
                  >
                    {badges.map((badge, idx) => (
                      <IndexTable.Row id={badge.id} key={badge.id} position={idx}>
                        <IndexTable.Cell>
                          <div style={{
                            background: badge.shape === "OUTLINE" ? "transparent" : badge.bgColor,
                            color: badge.shape === "OUTLINE" ? badge.bgColor : badge.textColor,
                            border: `1.5px solid ${badge.borderColor || badge.bgColor}`,
                            borderRadius: badge.shape === "PILL" ? "999px" : `${badge.borderRadius}px`,
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }}>
                            {badge.icon && <span>{badge.icon}</span>}
                            <span>{badge.text}</span>
                          </div>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text variant="bodyMd" fontWeight="bold">{badge.name}</Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <InlineStack gap="200">
                            <PolarisBadge tone={badge.enabled ? "success" : "subdued"}>{badge.enabled ? "Live" : "Disabled"}</PolarisBadge>
                            <Button size="micro" onClick={() => handleToggleBadge(badge)}>{badge.enabled ? "Disable" : "Enable"}</Button>
                          </InlineStack>
                        </IndexTable.Cell>
                        <IndexTable.Cell><PolarisBadge tone="info">{badge.targetType}</PolarisBadge></IndexTable.Cell>
                        <IndexTable.Cell><PolarisBadge tone="attention">{badge.priority}</PolarisBadge></IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text variant="bodySm">{badge.impressions || 0} imp · {badge.clicks || 0} clicks</Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <InlineStack gap="100">
                            <Tooltip content="Edit"><Button icon={EditIcon} size="micro" onClick={() => handleOpenModal(badge)} /></Tooltip>
                            <Tooltip content="Duplicate"><Button icon={DuplicateIcon} size="micro" onClick={() => handleDuplicate(badge.id)} /></Tooltip>
                            <Tooltip content="Delete"><Button icon={DeleteIcon} tone="critical" size="micro" onClick={() => handleDelete(badge.id)} /></Tooltip>
                          </InlineStack>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                )}
              </BlockStack>
            )}

            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text variant="headingLg">Performance Analytics</Text>
                <Text variant="bodyMd" tone="subdued">Detailed breakdown of customer engagement across all active campaigns.</Text>
                <Card padding="400">
                  <BlockStack gap="300">
                    {badges.map((b) => (
                      <InlineStack key={b.id} align="space-between">
                        <Text fontWeight="semibold">{b.name}</Text>
                        <Text>{b.impressions || 0} Impressions | {b.clicks || 0} Clicks</Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </Card>
              </BlockStack>
            )}

            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text variant="headingLg">Global Store Settings</Text>
                <TextField label="Global Custom CSS" value={globalCssState} onChange={setGlobalCssState} multiline={6} autoComplete="off" />
                <InlineStack align="end">
                  <Button variant="primary" loading={isSaving} onClick={() => submit({ intent: "SAVE_SETTINGS", globalCustomCss: globalCssState }, { method: "post" })}>
                    Save Settings
                  </Button>
                </InlineStack>
              </BlockStack>
            )}
          </Box>
        </Card>

        {/* MODAL EDITOR */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={formData.id === "new" ? "Create Pro Badge" : `Edit ${formData.name}`}
          primaryAction={{ content: "Save & Publish", onAction: handleSaveForm, loading: isSaving }}
          secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
          size="large"
        >
          <Modal.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, sm: 7, md: 7, lg: 7, xl: 7 }}>
                <BlockStack gap="400">
                  <Card padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingMd">Campaign Status</Text>
                      <Checkbox label="Enabled" checked={formData.enabled} onChange={(v) => updateForm("enabled", v)} />
                    </InlineStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Quick Presets (Images 4, 5, 6 Style)</Text>
                      <InlineStack gap="200" wrap>
                        <Button onClick={() => handleApplyPreset("BLACK_FRIDAY")}>Black Friday</Button>
                        <Button onClick={() => handleApplyPreset("URGENCY")}>Urgency</Button>
                        <Button onClick={() => handleApplyPreset("MINIMAL")}>Minimal</Button>
                        <Button onClick={() => handleApplyPreset("ECO")}>Eco</Button>
                        <Button onClick={() => handleApplyPreset("HOT_SALE")}>Hot Sale</Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Badge Content</Text>
                      <TextField label="Campaign Name" value={formData.name} onChange={(v) => updateForm("name", v)} autoComplete="off" />
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 8, sm: 8 }}><TextField label="Text" value={formData.text} onChange={(v) => updateForm("text", v)} autoComplete="off" /></Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4 }}><TextField label="Icon" value={formData.icon} onChange={(v) => updateForm("icon", v)} autoComplete="off" /></Grid.Cell>
                      </Grid>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Appearance & Styling</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Background" type="color" value={formData.bgColor} onChange={(v) => updateForm("bgColor", v)} /></Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Text Color" type="color" value={formData.textColor} onChange={(v) => updateForm("textColor", v)} /></Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4 }}><TextField label="Border" type="color" value={formData.borderColor} onChange={(v) => updateForm("borderColor", v)} /></Grid.Cell>
                      </Grid>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6 }}>
                          <Select label="Shape" options={[{ label: "Pill", value: "PILL" }, { label: "Rounded", value: "ROUNDED" }, { label: "Sharp", value: "SHARP" }, { label: "Outline", value: "OUTLINE" }]} value={formData.shape} onChange={(v) => updateForm("shape", v)} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6 }}>
                          <Select label="Position" options={[{ label: "Top Left", value: "TOP_LEFT" }, { label: "Top Right", value: "TOP_RIGHT" }, { label: "Bottom Left", value: "BOTTOM_LEFT" }, { label: "Bottom Right", value: "BOTTOM_RIGHT" }]} value={formData.position} onChange={(v) => updateForm("position", v)} />
                        </Grid.Cell>
                      </Grid>
                      <RangeSlider label={`Font Size: ${formData.fontSize}px`} value={formData.fontSize} min={10} max={20} onChange={(v) => updateForm("fontSize", v)} output />
                      <RangeSlider label={`Padding X: ${formData.paddingX}px`} value={formData.paddingX} min={6} max={24} onChange={(v) => updateForm("paddingX", v)} output />
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Targeting Rule</Text>
                      <Select label="Condition" options={[{ label: "All Products (Global)", value: "GLOBAL" }, { label: "Specific Products", value: "SPECIFIC_PRODUCTS" }]} value={formData.targetType} onChange={(v) => updateForm("targetType", v)} />
                      {formData.targetType === "SPECIFIC_PRODUCTS" && (
                        <Button onClick={handleResourcePicker}>Choose Products ({(formData.productIds || []).length} selected)</Button>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, sm: 5, md: 5, lg: 5, xl: 5 }}>
                <Box style={{ position: "sticky", top: "16px" }}>
                  <Card padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between">
                        <Text variant="headingMd">Live Preview</Text>
                        <InlineStack gap="100">
                          <Button size="micro" pressed={previewTheme === "light"} onClick={() => setPreviewTheme("light")}>Light</Button>
                          <Button size="micro" pressed={previewTheme === "dark"} onClick={() => setPreviewTheme("dark")}>Dark</Button>
                        </InlineStack>
                      </InlineStack>
                      <Box padding="600" borderRadius="300" style={{ background: previewTheme === "light" ? "#f1f5f9" : "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "260px" }}>
                        <div style={{ width: "200px", height: "240px", background: previewTheme === "light" ? "#ffffff" : "#1e293b", borderRadius: "12px", position: "relative", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                          <div style={{ height: "140px", background: "#cbd5e1", position: "relative" }}>
                            <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                              <div style={previewBadgeStyle}>
                                {formData.icon && <span>{formData.icon}</span>}
                                <span>{formData.text}</span>
                              </div>
                            </div>
                          </div>
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