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

  bgColor: "#DC2626",
  textColor: "#FFFFFF",
  borderColor: "#991B1B",

  shape: "PILL",
  position: "TOP_LEFT",

  fontSize: 12,
  fontWeight: "bold",

  paddingX: 10,
  paddingY: 4,
  borderRadius: 20,

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
  products: [],
};

const STANDARD_PRESETS = {
  BLACK_FRIDAY: {
    text: "BLACK FRIDAY",
    icon: "⚡",
    bgColor: "#111111",
    textColor: "#FFFFFF",
    borderColor: "#000000",
    shape: "PILL",
  },
  URGENCY: {
    text: "ONLY FEW LEFT",
    icon: "🚨",
    bgColor: "#DC2626",
    textColor: "#FFFFFF",
    borderColor: "#991B1B",
    shape: "PILL",
  },
  MINIMAL: {
    text: "PREMIUM",
    icon: "✦",
    bgColor: "#FFFFFF",
    textColor: "#111827",
    borderColor: "#111827",
    shape: "OUTLINE",
  },
  ECO: {
    text: "100% ORGANIC",
    icon: "🌿",
    bgColor: "#059669",
    textColor: "#FFFFFF",
    borderColor: "#047857",
    shape: "PILL",
  },
  HOT_SALE: {
    text: "HOT SALE",
    icon: "🔥",
    bgColor: "#2563EB",
    textColor: "#FFFFFF",
    borderColor: "#1D4ED8",
    shape: "PILL",
  },
  BEST_SELLER: {
    text: "BEST SELLER",
    icon: "⭐",
    bgColor: "#111827",
    textColor: "#FFFFFF",
    borderColor: "#000000",
    shape: "PILL",
  },
};

const PREMIUM_PRESETS = {
  PREMIUM_RIBBON: {
    text: "NEW",
    icon: "",
    bgColor: "#DC2626",
    textColor: "#FFFFFF",
    borderColor: "#991B1B",
    shape: "RIBBON_BANNER",
    paddingX: 12,
    paddingY: 6,
    borderRadius: 2,
  },
  STARBURST_SEAL: {
    text: "NEW",
    icon: "",
    bgColor: "#DC2626",
    textColor: "#FFFFFF",
    borderColor: "#B91C1C",
    shape: "STARBURST",
    paddingX: 12,
    paddingY: 6,
    borderRadius: 6,
  },
  CORNER_TAG: {
    text: "NEW",
    icon: "",
    bgColor: "#DC2626",
    textColor: "#FFFFFF",
    borderColor: "#991B1B",
    shape: "CORNER_FOLD",
    paddingX: 12,
    paddingY: 6,
    borderRadius: 4,
  },
  FOLDED_RIBBON: {
    text: "NEW",
    icon: "",
    bgColor: "#B91C1C",
    textColor: "#FFFFFF",
    borderColor: "#7F1D1D",
    shape: "FOLDED_RIBBON",
    paddingX: 12,
    paddingY: 6,
    borderRadius: 2,
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
    paddingX: Number(badge.paddingX ?? 10),
    paddingY: Number(badge.paddingY ?? 4),
    borderRadius: Number(badge.borderRadius ?? 20),
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
    products: Array.isArray(badge.products) ? badge.products : [],
  };
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.appSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await db.appSettings.create({
      data: { shop },
    });
  }

  const badges = await db.badge.findMany({
    where: { shop },
    include: {
      products: true,
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  const formattedBadges = badges.map((badge) => ({
    ...badge,
    productIds: badge.products ? badge.products.map((p) => p.productId) : [],
    products: badge.products ? badge.products.map((p) => ({ id: p.productId, handle: p.productHandle })) : [],
  }));

  const totalImpressions = formattedBadges.reduce((t, b) => t + Number(b.impressions || 0), 0);
  const totalClicks = formattedBadges.reduce((t, b) => t + Number(b.clicks || 0), 0);
  const totalConversions = formattedBadges.reduce((t, b) => t + Number(b.conversions || 0), 0);

  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  return json({
    shop,
    settings,
    badges: formattedBadges,
    analytics: {
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr,
    },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "DELETE") {
    const id = String(formData.get("id") || "");
    const existing = await db.badge.findFirst({ where: { id, shop } });
    if (!existing) return json({ success: false, message: "Badge campaign not found." }, { status: 404 });

    await db.badge.delete({ where: { id: existing.id } });
    return json({ success: true, message: "Badge campaign deleted successfully." });
  }

  if (intent === "DUPLICATE") {
    const id = String(formData.get("id") || "");
    const existing = await db.badge.findFirst({ where: { id, shop } });
    if (!existing) return json({ success: false, message: "Badge campaign not found." }, { status: 404 });

    await db.$transaction(async (tx) => {
      const duplicate = await tx.badge.create({
        data: {
          shop,
          name: `${existing.name} Copy`,
          enabled: false,
          priority: existing.priority || 0,
          text: existing.text || "",
          bgColor: existing.bgColor || "#111827",
          textColor: existing.textColor || "#FFFFFF",
          borderColor: existing.borderColor || "#000000",
          position: existing.position || "TOP_LEFT",
          shape: existing.shape || "PILL",
          icon: existing.icon || "",
          fontSize: existing.fontSize || 12,
          fontWeight: existing.fontWeight || "bold",
          paddingY: existing.paddingY || 4,
          paddingX: existing.paddingX || 10,
          borderRadius: existing.borderRadius || 20,
          customCss: existing.customCss || "",
          hideOnMobile: Boolean(existing.hideOnMobile),
          hideOnDesktop: Boolean(existing.hideOnDesktop),
          targetType: existing.targetType || "GLOBAL",
          targetTags: existing.targetTags || "",
          targetCollection: existing.targetCollection || "",
          minInventory: existing.minInventory || 0,
          maxInventory: existing.maxInventory || 9999,
          minPrice: existing.minPrice || 0,
          maxPrice: existing.maxPrice || 99999,
          startDate: existing.startDate,
          endDate: existing.endDate,
        },
      });

      const existingProducts = await tx.badgeProduct.findMany({ where: { badgeId: existing.id } });
      if (existingProducts.length > 0) {
        await tx.badgeProduct.createMany({
          data: existingProducts.map((p) => ({
            badgeId: duplicate.id,
            productId: p.productId,
            productHandle: p.productHandle,
          })),
        });
      }
    });

    return json({ success: true, message: "Badge campaign duplicated successfully." });
  }

  if (intent === "SAVE_SETTINGS") {
    const globalCustomCss = String(formData.get("globalCustomCss") || "");
    await db.appSettings.update({ where: { shop }, data: { globalCustomCss } });
    return json({ success: true, message: "Global badge settings saved successfully." });
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim() || "Untitled Badge Campaign";
  const enabled = formData.get("enabled") === "true";
  const text = String(formData.get("text") || "BADGE").trim();
  const icon = String(formData.get("icon") || "");
  const bgColor = String(formData.get("bgColor") || "#111827");
  const textColor = String(formData.get("textColor") || "#FFFFFF");
  const borderColor = String(formData.get("borderColor") || "#000000");
  const position = String(formData.get("position") || "TOP_LEFT");
  const shape = String(formData.get("shape") || "PILL");

  const fontSize = parseInt(formData.get("fontSize") || "12", 10) || 12;
  const fontWeight = String(formData.get("fontWeight") || "bold");
  const paddingX = parseInt(formData.get("paddingX") || "10", 10) || 10;
  const paddingY = parseInt(formData.get("paddingY") || "4", 10) || 4;
  const borderRadius = parseInt(formData.get("borderRadius") || "20", 10) || 20;
  const priority = parseInt(formData.get("priority") || "0", 10) || 0;

  const targetType = String(formData.get("targetType") || "GLOBAL");
  const targetTags = String(formData.get("targetTags") || "");
  const minInventory = parseInt(formData.get("minInventory") || "0", 10) || 0;
  const maxInventory = parseInt(formData.get("maxInventory") || "9999", 10) || 9999;
  const minPrice = parseFloat(formData.get("minPrice") || "0") || 0;
  const maxPrice = parseFloat(formData.get("maxPrice") || "99999") || 99999;

  const customCss = String(formData.get("customCss") || "");
  const hideOnMobile = formData.get("hideOnMobile") === "true";
  const hideOnDesktop = formData.get("hideOnDesktop") === "true";

  const startDateRaw = String(formData.get("startDate") || "");
  const endDateRaw = String(formData.get("endDate") || "");
  const startDate = startDateRaw ? new Date(`${startDateRaw}T00:00:00`) : null;
  const endDate = endDateRaw ? new Date(`${endDateRaw}T23:59:59`) : null;

  let products = [];
  try {
    products = JSON.parse(String(formData.get("products") || "[]"));
  } catch {
    products = [];
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
      const existing = await tx.badge.findFirst({ where: { id, shop } });
      if (!existing) throw new Error("Badge campaign not found.");
      badge = await tx.badge.update({ where: { id: existing.id }, data: payload });
    } else {
      badge = await tx.badge.create({ data: payload });
    }

    await tx.badgeProduct.deleteMany({ where: { badgeId: badge.id } });

    if (targetType === "SPECIFIC_PRODUCTS" && Array.isArray(products) && products.length > 0) {
      await tx.badgeProduct.createMany({
        data: products.map((p) => ({
          badgeId: badge.id,
          productId: String(p.id),
          productHandle: String(p.handle || ""),
        })),
      });
    }
  });

  return json({
    success: true,
    message: enabled ? "Badge campaign saved and published." : "Badge campaign saved as disabled.",
  });
};

export default function SaaSAdminApp() {
  const { settings, badges = [], analytics = {} } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedTab, setSelectedTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("standard"); // "standard" or "premium"
  const [globalCssState, setGlobalCssState] = useState(settings?.globalCustomCss || "");
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [previewTheme, setPreviewTheme] = useState("light");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isSaving = navigation.state === "submitting";

  const activeBadges = useMemo(() => badges.filter((b) => b.enabled), [badges]);
  const disabledBadges = useMemo(() => badges.filter((b) => !b.enabled), [badges]);

  const handleOpenModal = (type = "standard", badge = null) => {
    setModalType(type);
    if (badge) {
      setFormData(badgeToForm(badge));
      // determine if existing badge is premium or standard based on shape
      const isPrem = ["RIBBON_BANNER", "STARBURST", "CORNER_FOLD", "FOLDED_RIBBON"].includes(badge.shape);
      setModalType(isPrem ? "premium" : "standard");
    } else {
      setFormData({
        ...DEFAULT_FORM,
        id: "new",
        name: type === "premium" ? `Premium Badge #${badges.length + 1}` : `Badge Campaign #${badges.length + 1}`,
        shape: type === "premium" ? "RIBBON_BANNER" : "PILL",
        text: type === "premium" ? "NEW" : "LIMITED STOCK",
        icon: type === "premium" ? "" : "⚡",
      });
    }
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const updateForm = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = (presetKey) => {
    const preset = modalType === "premium" ? PREMIUM_PRESETS[presetKey] : STANDARD_PRESETS[presetKey];
    if (!preset) return;
    setFormData((prev) => ({ ...prev, ...preset }));
  };

  const handleSaveForm = () => {
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "products" || key === "productIds") {
        data.append(key, JSON.stringify(value || []));
      } else {
        data.append(key, value === undefined || value === null ? "" : String(value));
      }
    });
    submit(data, { method: "post" });
    setModalOpen(false);
  };

  const handleDuplicate = (id) => {
    submit({ intent: "DUPLICATE", id }, { method: "post" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this badge campaign permanently?")) return;
    submit({ intent: "DELETE", id }, { method: "post" });
  };

  const handleToggleBadge = (badge) => {
    const data = new FormData();
    Object.entries(badgeToForm(badge)).forEach(([key, value]) => {
      if (key === "products" || key === "productIds") {
        data.append(key, JSON.stringify(value || []));
      } else {
        data.append(key, value === undefined || value === null ? "" : String(value));
      }
    });
    data.set("enabled", badge.enabled ? "false" : "true");
    submit(data, { method: "post" });
  };

  const handleSaveSettings = () => {
    submit({ intent: "SAVE_SETTINGS", globalCustomCss: globalCssState }, { method: "post" });
  };

  const handleResourcePicker = async () => {
    if (typeof window === "undefined" || !window.shopify?.resourcePicker) {
      window.alert("Shopify Resource Picker is not available in this session.");
      return;
    }

    const selected = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: (formData.products || []).map((p) => ({ id: p.id })),
    });

    if (selected) {
      setFormData((prev) => ({
        ...prev,
        products: selected.map((product) => ({
          id: product.id,
          handle: product.handle,
        })),
        productIds: selected.map((product) => product.id),
      }));
    }
  };

  let previewShapeStyles = {
    background: formData.bgColor || "#DC2626",
    color: formData.textColor || "#FFFFFF",
    border: `1px solid ${formData.borderColor || formData.bgColor || "#991B1B"}`,
    borderRadius: `${formData.borderRadius || 20}px`,
    padding: `${formData.paddingY || 4}px ${formData.paddingX || 10}px`,
    fontSize: `${formData.fontSize || 12}px`,
    fontWeight: formData.fontWeight || "bold",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    textTransform: "uppercase",
  };

  if (formData.shape === "RIBBON_BANNER") {
    previewShapeStyles = {
      ...previewShapeStyles,
      borderRadius: "2px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
    };
  } else if (formData.shape === "STARBURST") {
    previewShapeStyles = {
      ...previewShapeStyles,
      borderRadius: "6px",
      boxShadow: `0 0 0 3px ${formData.bgColor || "#DC2626"}, 0 6px 15px rgba(0,0,0,0.4)`,
    };
  } else if (formData.shape === "CORNER_FOLD") {
    previewShapeStyles = {
      ...previewShapeStyles,
      borderRadius: "0px 4px 4px 0px",
      boxShadow: "2px 4px 10px rgba(0,0,0,0.3)",
    };
  } else if (formData.shape === "FOLDED_RIBBON") {
    previewShapeStyles = {
      ...previewShapeStyles,
      borderRadius: "2px",
      boxShadow: "inset -4px 0 6px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.3)",
    };
  }

  return (
    <Page
      title="Badge Studio"
      subtitle="Create, control and optimize storefront product badges."
      primaryAction={{
        content: "Create badge",
        icon: PlusIcon,
        onAction: () => handleOpenModal("standard"),
      }}
      secondaryActions={[
        {
          content: "Create premium badge",
          icon: PlusIcon,
          onAction: () => handleOpenModal("premium"),
        },
      ]}
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
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Active badges</Text>
                <Text variant="headingXl">{activeBadges.length}</Text>
                <PolarisBadge tone="success">Storefront ready</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Total campaigns</Text>
                <Text variant="headingXl">{badges.length}</Text>
                <Text variant="bodySm" tone="subdued">{disabledBadges.length} disabled</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Impressions</Text>
                <Text variant="headingXl">{Number(analytics.totalImpressions || 0).toLocaleString()}</Text>
                <PolarisBadge tone="info">Analytics</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Average CTR</Text>
                <Text variant="headingXl">{analytics.avgCtr || "0.00"}%</Text>
                <PolarisBadge tone="attention">{analytics.totalClicks || 0} clicks</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Card padding="0">
          <Tabs
            tabs={[
              { id: "campaigns", content: "Campaigns" },
              { id: "analytics", content: "Analytics" },
              { id: "settings", content: "Store settings" },
            ]}
            selected={selectedTab}
            onSelect={setSelectedTab}
          />

          <Box padding="500">
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd">Badge campaigns</Text>
                    <Text variant="bodySm" tone="subdued">Manage every badge displayed on your storefront.</Text>
                  </BlockStack>
                  <InlineStack gap="300">
                    <Button
                      onClick={() => handleOpenModal("premium")}
                    >
                      Create premium badge
                    </Button>
                    <Button
                      variant="primary"
                      icon={PlusIcon}
                      onClick={() => handleOpenModal("standard")}
                    >
                      Create badge
                    </Button>
                  </InlineStack>
                </InlineStack>

                <Divider />

                {badges.length === 0 ? (
                  <EmptyState
                    heading="Create your first badge"
                    action={{ content: "Create badge", onAction: () => handleOpenModal("standard") }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>Create a product badge and publish it to your Shopify storefront.</p>
                  </EmptyState>
                ) : (
                  <IndexTable
                    resourceName={{ singular: "badge", plural: "badges" }}
                    itemCount={badges.length}
                    selectable={false}
                    headings={[
                      { title: "Preview" },
                      { title: "Campaign" },
                      { title: "Status" },
                      { title: "Target" },
                      { title: "Priority" },
                      { title: "Performance" },
                      { title: "Actions" },
                    ]}
                  >
                    {badges.map((badge, index) => {
                      const ctr = badge.impressions > 0 ? ((badge.clicks / badge.impressions) * 100).toFixed(2) : "0.00";
                      return (
                        <IndexTable.Row id={badge.id} key={badge.id} position={index}>
                          <IndexTable.Cell>
                            <div
                              style={{
                                background: badge.shape === "OUTLINE" ? "transparent" : badge.bgColor,
                                color: badge.shape === "OUTLINE" ? badge.bgColor : badge.textColor,
                                border: `1px solid ${badge.borderColor || badge.bgColor}`,
                                borderRadius: badge.shape === "PILL" ? "999px" : badge.shape === "SHARP" ? "0px" : `${badge.borderRadius}px`,
                                padding: `4px 10px`,
                                fontSize: `12px`,
                                fontWeight: badge.fontWeight || "700",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {badge.icon && <span>{badge.icon}</span>}
                              <span>{badge.text}</span>
                            </div>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="bold">{badge.name}</Text>
                              <Text variant="bodySm" tone="subdued">
                                {badge.targetType === "GLOBAL" ? "All products" : `${(badge.products || []).length} selected products`}
                              </Text>
                            </BlockStack>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <InlineStack gap="200">
                              <PolarisBadge tone={badge.enabled ? "success" : "subdued"}>
                                {badge.enabled ? "Live" : "Disabled"}
                              </PolarisBadge>
                              <Button size="micro" onClick={() => handleToggleBadge(badge)}>
                                {badge.enabled ? "Disable" : "Enable"}
                              </Button>
                            </InlineStack>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <PolarisBadge tone="info">
                              {badge.targetType === "GLOBAL" ? "Storewide" : "Specific products"}
                            </PolarisBadge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <PolarisBadge tone="attention">{badge.priority}</PolarisBadge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <BlockStack gap="050">
                              <Text variant="bodySm">{Number(badge.impressions || 0).toLocaleString()} impressions</Text>
                              <Text variant="bodySm" tone="subdued">{Number(badge.clicks || 0).toLocaleString()} clicks · {ctr}% CTR</Text>
                            </BlockStack>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <InlineStack gap="100">
                              <Tooltip content="Edit badge">
                                <Button icon={EditIcon} size="micro" onClick={() => handleOpenModal(modalType, badge)} />
                              </Tooltip>
                              <Tooltip content="Duplicate badge">
                                <Button icon={DuplicateIcon} size="micro" onClick={() => handleDuplicate(badge.id)} />
                              </Tooltip>
                              <Tooltip content="Delete badge">
                                <Button icon={DeleteIcon} tone="critical" size="micro" onClick={() => handleDelete(badge.id)} />
                              </Tooltip>
                            </InlineStack>
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      );
                    })}
                  </IndexTable>
                )}
              </BlockStack>
            )}

            {selectedTab === 1 && (
              <BlockStack gap="500">
                <Text variant="headingLg">Conversion insights</Text>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400"><Text variant="bodySm" tone="subdued">Impressions</Text><Text variant="headingLg">{analytics.totalImpressions || 0}</Text></Card>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400"><Text variant="bodySm" tone="subdued">Clicks</Text><Text variant="headingLg">{analytics.totalClicks || 0}</Text></Card>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400"><Text variant="bodySm" tone="subdued">CTR</Text><Text variant="headingLg">{analytics.avgCtr || "0.00"}%</Text></Card>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400"><Text variant="bodySm" tone="subdued">Conversions</Text><Text variant="headingLg">{analytics.totalConversions || 0}</Text></Card>
                  </Grid.Cell>
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
                    <InlineStack align="end">
                      <Button variant="primary" loading={isSaving} onClick={handleSaveSettings}>Save settings</Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            )}
          </Box>
        </Card>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            formData.id !== "new"
              ? `Edit ${formData.name}`
              : modalType === "premium"
              ? "Create premium badge"
              : "Create badge campaign"
          }
          primaryAction={{ content: formData.enabled ? "Save & publish" : "Save as disabled", onAction: handleSaveForm, loading: isSaving }}
          secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
          size="large"
        >
          <Modal.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, sm: 7, md: 7, lg: 7, xl: 7 }}>
                <BlockStack gap="500">
                  <Card padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingMd">Campaign status</Text>
                      <Checkbox label={formData.enabled ? "Enabled" : "Disabled"} checked={formData.enabled} onChange={(v) => updateForm("enabled", v)} />
                    </InlineStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">
                        {modalType === "premium" ? "Premium 3D Badge Presets" : "Quick styles"}
                      </Text>
                      <InlineStack gap="200" wrap>
                        {modalType === "premium" ? (
                          <>
                            <Button onClick={() => handleApplyPreset("PREMIUM_RIBBON")}>Ribbon Banner</Button>
                            <Button onClick={() => handleApplyPreset("STARBURST_SEAL")}>Starburst Seal</Button>
                            <Button onClick={() => handleApplyPreset("CORNER_TAG")}>Corner Tag</Button>
                            <Button onClick={() => handleApplyPreset("FOLDED_RIBBON")}>Folded Ribbon</Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => handleApplyPreset("BLACK_FRIDAY")}>Black Friday</Button>
                            <Button onClick={() => handleApplyPreset("URGENCY")}>Urgency</Button>
                            <Button onClick={() => handleApplyPreset("MINIMAL")}>Minimal</Button>
                            <Button onClick={() => handleApplyPreset("ECO")}>Eco</Button>
                            <Button onClick={() => handleApplyPreset("HOT_SALE")}>Hot Sale</Button>
                            <Button onClick={() => handleApplyPreset("BEST_SELLER")}>Best Seller</Button>
                          </>
                        )}
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Badge content</Text>
                      <TextField label="Internal name" value={formData.name} onChange={(v) => updateForm("name", v)} autoComplete="off" />
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: modalType === "premium" ? 12 : 8, sm: modalType === "premium" ? 12 : 8, md: modalType === "premium" ? 12 : 8, lg: modalType === "premium" ? 12 : 8, xl: modalType === "premium" ? 12 : 8 }}>
                          <TextField label="Badge text" value={formData.text} onChange={(v) => updateForm("text", v)} autoComplete="off" />
                        </Grid.Cell>
                        {modalType !== "premium" && (
                          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                            <TextField label="Icon" value={formData.icon} onChange={(v) => updateForm("icon", v)} autoComplete="off" />
                          </Grid.Cell>
                        )}
                      </Grid>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Appearance</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField label="Background" type="color" value={formData.bgColor} onChange={(v) => updateForm("bgColor", v)} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField label="Text" type="color" value={formData.textColor} onChange={(v) => updateForm("textColor", v)} />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField label="Border" type="color" value={formData.borderColor} onChange={(v) => updateForm("borderColor", v)} />
                        </Grid.Cell>
                      </Grid>

                      <Select
                        label="Shape Style"
                        options={
                          modalType === "premium"
                            ? [
                                { label: "Ribbon Banner (Premium 3D)", value: "RIBBON_BANNER" },
                                { label: "Starburst Seal (Premium 3D)", value: "STARBURST" },
                                { label: "Corner Fold Tag (Premium 3D)", value: "CORNER_FOLD" },
                                { label: "Folded Ribbon Tag (Premium 3D)", value: "FOLDED_RIBBON" },
                              ]
                            : [
                                { label: "Pill", value: "PILL" },
                                { label: "Sharp", value: "SHARP" },
                                { label: "Outline", value: "OUTLINE" },
                                { label: "Glassmorphism", value: "GLASSMORPHISM" },
                              ]
                        }
                        value={formData.shape}
                        onChange={(v) => updateForm("shape", v)}
                      />

                      <RangeSlider label={`Font size: ${formData.fontSize}px`} value={formData.fontSize} min={8} max={24} onChange={(v) => updateForm("fontSize", v)} output />
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Targeting</Text>
                      <Select
                        label="Display condition"
                        options={[
                          { label: "All products", value: "GLOBAL" },
                          { label: "Specific products", value: "SPECIFIC_PRODUCTS" },
                        ]}
                        value={formData.targetType}
                        onChange={(v) => updateForm("targetType", v)}
                      />

                      {formData.targetType === "SPECIFIC_PRODUCTS" && (
                        <Card background="bg-surface-secondary" padding="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text>{(formData.products || []).length} products selected</Text>
                            <Button onClick={handleResourcePicker}>Choose products</Button>
                          </InlineStack>
                        </Card>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, sm: 5, md: 5, lg: 5, xl: 5 }}>
                <Box style={{ position: "sticky", top: "16px" }}>
                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Live preview</Text>
                      <Box
                        padding="600"
                        borderRadius="300"
                        style={{
                          minHeight: "250px",
                          background: "#f8fafc",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div style={previewShapeStyles}>
                          {formData.icon && <span>{formData.icon}</span>}
                          <span>{formData.text || (modalType === "premium" ? "NEW" : "BADGE")}</span>
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