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

/* =========================================================
   HELPERS
========================================================= */

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
};

const PRESETS = {
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

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
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

    productIds: Array.isArray(badge.productIds)
      ? badge.productIds
      : [],
  };
}

/* =========================================================
   LOADER
========================================================= */

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
    productIds: badge.products ? badge.products.map((product) => product.productId) : [],
  }));

  const totalImpressions = formattedBadges.reduce(
    (total, badge) => total + Number(badge.impressions || 0),
    0
  );

  const totalClicks = formattedBadges.reduce(
    (total, badge) => total + Number(badge.clicks || 0),
    0
  );

  const totalConversions = formattedBadges.reduce(
    (total, badge) => total + Number(badge.conversions || 0),
    0
  );

  const avgCtr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  const conversionRate =
    totalClicks > 0
      ? ((totalConversions / totalClicks) * 100).toFixed(2)
      : "0.00";

  return json({
    shop,
    settings,
    badges: formattedBadges,
    analytics: {
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr,
      conversionRate,
    },
  });
};

/* =========================================================
   ACTION
========================================================= */

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  /* ---------------- DELETE ---------------- */

  if (intent === "DELETE") {
    const id = String(formData.get("id") || "");

    const existing = await db.badge.findFirst({
      where: { id, shop },
    });

    if (!existing) {
      return json(
        {
          success: false,
          message: "Badge campaign could not be found.",
        },
        { status: 404 }
      );
    }

    await db.badge.delete({
      where: { id: existing.id },
    });

    return json({
      success: true,
      message: "Badge campaign deleted successfully.",
    });
  }

  /* ---------------- DUPLICATE ---------------- */

  if (intent === "DUPLICATE") {
    const id = String(formData.get("id") || "");

    const existing = await db.badge.findFirst({
      where: { id, shop },
    });

    if (!existing) {
      return json(
        {
          success: false,
          message: "Badge campaign could not be found.",
        },
        { status: 404 }
      );
    }

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

      const existingProducts = await tx.badgeProduct.findMany({
        where: { badgeId: existing.id },
      });

      if (existingProducts.length > 0) {
        await tx.badgeProduct.createMany({
          data: existingProducts.map((product) => ({
            badgeId: duplicate.id,
            productId: product.productId,
          })),
        });
      }
    });

    return json({
      success: true,
      message: "Badge campaign duplicated successfully.",
    });
  }

  /* ---------------- SETTINGS ---------------- */

  if (intent === "SAVE_SETTINGS") {
    const globalCustomCss = String(formData.get("globalCustomCss") || "");

    await db.appSettings.update({
      where: { shop },
      data: { globalCustomCss },
    });

    return json({
      success: true,
      message: "Global badge settings saved successfully.",
    });
  }

  /* ---------------- SAVE BADGE ---------------- */

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
      const existing = await tx.badge.findFirst({
        where: { id, shop },
      });

      if (!existing) {
        throw new Error("Badge campaign not found.");
      }

      badge = await tx.badge.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      badge = await tx.badge.create({
        data: payload,
      });
    }

    await tx.badgeProduct.deleteMany({
      where: { badgeId: badge.id },
    });

    if (
      targetType === "SPECIFIC_PRODUCTS" &&
      Array.isArray(productIds) &&
      productIds.length > 0
    ) {
      await tx.badgeProduct.createMany({
        data: productIds.map((productId) => ({
          badgeId: badge.id,
          productId: String(productId),
        })),
      });
    }
  });

  return json({
    success: true,
    message: enabled
      ? "Badge campaign saved and published."
      : "Badge campaign saved as disabled.",
  });
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

  /* =====================================================
     DERIVED DASHBOARD DATA
  ===================================================== */

  const activeBadges = useMemo(
    () => badges.filter((badge) => badge.enabled),
    [badges]
  );

  const disabledBadges = useMemo(
    () => badges.filter((badge) => !badge.enabled),
    [badges]
  );

  /* =====================================================
     OPEN EDITOR
  ===================================================== */

  const handleOpenModal = (badge = null) => {
    if (badge) {
      setFormData(badgeToForm(badge));
    } else {
      setFormData({
        ...DEFAULT_FORM,
        id: "new",
        name: `Badge Campaign #${badges.length + 1}`,
      });
    }

    setShowAdvanced(false);
    setModalOpen(true);
  };

  /* =====================================================
     UPDATE FORM
  ===================================================== */

  const updateForm = (key, value) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  /* =====================================================
     PRESETS
  ===================================================== */

  const handleApplyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    setFormData((previous) => ({
      ...previous,
      ...preset,
    }));
  };

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSaveForm = () => {
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (key === "productIds") {
        data.append(key, JSON.stringify(value || []));
      } else {
        data.append(
          key,
          value === undefined || value === null ? "" : String(value)
        );
      }
    });

    submit(data, { method: "post" });
    setModalOpen(false);
  };

  /* =====================================================
     DUPLICATE
  ===================================================== */

  const handleDuplicate = (id) => {
    submit({ intent: "DUPLICATE", id }, { method: "post" });
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Delete this badge campaign permanently?"
    );
    if (!confirmed) return;

    submit({ intent: "DELETE", id }, { method: "post" });
  };

  /* =====================================================
     QUICK ENABLE / DISABLE
  ===================================================== */

  const handleToggleBadge = (badge) => {
    const data = new FormData();

    Object.entries(badgeToForm(badge)).forEach(([key, value]) => {
      if (key === "productIds") {
        data.append(key, JSON.stringify(value || []));
      } else {
        data.append(
          key,
          value === undefined || value === null ? "" : String(value)
        );
      }
    });

    data.set("enabled", badge.enabled ? "false" : "true");

    submit(data, { method: "post" });
  };

  /* =====================================================
     GLOBAL SETTINGS
  ===================================================== */

  const handleSaveSettings = () => {
    submit(
      {
        intent: "SAVE_SETTINGS",
        globalCustomCss: globalCssState,
      },
      { method: "post" }
    );
  };

  /* =====================================================
     PRODUCT RESOURCE PICKER
  ===================================================== */

  const handleResourcePicker = async () => {
    if (typeof window === "undefined" || !window.shopify?.resourcePicker) {
      window.alert("Shopify Resource Picker is not available in this session.");
      return;
    }

    const selected = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: (formData.productIds || []).map((id) => ({ id })),
    });

    if (selected) {
      setFormData((previous) => ({
        ...previous,
        productIds: selected.map((product) => product.id),
      }));
    }
  };

  /* =====================================================
     BADGE PREVIEW
  ===================================================== */

  const previewBadgeStyle = {
    background:
      formData.shape === "OUTLINE"
        ? "transparent"
        : formData.shape === "GLASSMORPHISM"
        ? `${formData.bgColor || "#DC2626"}CC`
        : formData.bgColor || "#DC2626",

    color:
      formData.shape === "OUTLINE"
        ? formData.bgColor || "#DC2626"
        : formData.textColor || "#FFFFFF",

    border: `1px solid ${formData.borderColor || formData.bgColor || "#991B1B"}`,

    borderRadius:
      formData.shape === "PILL"
        ? "999px"
        : formData.shape === "SHARP"
        ? "0px"
        : `${formData.borderRadius || 20}px`,

    padding: `${formData.paddingY || 4}px ${formData.paddingX || 10}px`,

    fontSize: `${formData.fontSize || 12}px`,

    fontWeight: formData.fontWeight || "bold",

    backdropFilter:
      formData.shape === "GLASSMORPHISM" ? "blur(10px)" : "none",

    boxShadow:
      formData.shape === "GLASSMORPHISM"
        ? "0 8px 30px rgba(0,0,0,.18)"
        : "0 3px 12px rgba(0,0,0,.15)",

    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    lineHeight: "1.2",
    textTransform: "uppercase",
    letterSpacing: "0.2px",
  };

  const safePosition = formData.position || "TOP_LEFT";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <Page
      title="Badge Studio"
      subtitle="Create, control and optimize storefront product badges."
      primaryAction={{
        content: "Create badge",
        icon: PlusIcon,
        onAction: () => handleOpenModal(),
      }}
    >
      <BlockStack gap="500">
        {/* SUCCESS MESSAGE */}
        {actionData?.message && (
          <Banner
            tone={actionData.success === false ? "critical" : "success"}
          >
            {actionData.message}
          </Banner>
        )}

        {/* TOP SUMMARY */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">
                  Active badges
                </Text>
                <Text variant="headingXl">{activeBadges.length}</Text>
                <PolarisBadge tone="success">
                  {badges.length === 0 ? "No campaigns" : "Storefront ready"}
                </PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">
                  Total campaigns
                </Text>
                <Text variant="headingXl">{badges.length}</Text>
                <Text variant="bodySm" tone="subdued">
                  {disabledBadges.length} disabled
                </Text>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">
                  Badge impressions
                </Text>
                <Text variant="headingXl">
                  {Number(analytics.totalImpressions || 0).toLocaleString()}
                </Text>
                <PolarisBadge tone="info">Storefront analytics</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">
                  Average CTR
                </Text>
                <Text variant="headingXl">{analytics.avgCtr || "0.00"}%</Text>
                <PolarisBadge tone="attention">
                  {Number(analytics.totalClicks || 0).toLocaleString()} clicks
                </PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* MAIN WORKSPACE */}
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
            {/* CAMPAIGNS TAB */}
            {selectedTab === 0 && (
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd">Badge campaigns</Text>
                    <Text variant="bodySm" tone="subdued">
                      Manage every badge displayed on your storefront.
                    </Text>
                  </BlockStack>

                  <Button
                    variant="primary"
                    icon={PlusIcon}
                    onClick={() => handleOpenModal()}
                  >
                    Create badge
                  </Button>
                </InlineStack>

                <Divider />

                {badges.length === 0 ? (
                  <EmptyState
                    heading="Create your first badge"
                    action={{
                      content: "Create badge",
                      onAction: () => handleOpenModal(),
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Create a product badge and publish it to your Shopify storefront.
                    </p>
                  </EmptyState>
                ) : (
                  <IndexTable
                    resourceName={{
                      singular: "badge",
                      plural: "badges",
                    }}
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
                      const ctr =
                        badge.impressions > 0
                          ? ((badge.clicks / badge.impressions) * 100).toFixed(2)
                          : "0.00";

                      return (
                        <IndexTable.Row
                          id={badge.id}
                          key={badge.id}
                          position={index}
                        >
                          <IndexTable.Cell>
                            <div
                              style={{
                                background:
                                  badge.shape === "OUTLINE"
                                    ? "transparent"
                                    : badge.bgColor,
                                color:
                                  badge.shape === "OUTLINE"
                                    ? badge.bgColor
                                    : badge.textColor,
                                border: `1px solid ${
                                  badge.borderColor || badge.bgColor
                                }`,
                                borderRadius:
                                  badge.shape === "PILL"
                                    ? "999px"
                                    : badge.shape === "SHARP"
                                    ? "0px"
                                    : `${badge.borderRadius}px`,
                                padding: `${Math.min(
                                  badge.paddingY || 4,
                                  6
                                )}px ${Math.min(badge.paddingX || 10, 12)}px`,
                                fontSize: `${Math.min(
                                  badge.fontSize || 12,
                                  13
                                )}px`,
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
                              <Text variant="bodyMd" fontWeight="bold">
                                {badge.name}
                              </Text>
                              <Text variant="bodySm" tone="subdued">
                                {badge.targetType === "GLOBAL"
                                  ? "All products"
                                  : badge.targetType === "SPECIFIC_PRODUCTS"
                                  ? `${(badge.productIds || []).length} selected products`
                                  : badge.targetType === "PRODUCT_TAGS"
                                  ? "Product tags"
                                  : badge.targetType === "INVENTORY_LEVEL"
                                  ? "Inventory rule"
                                  : badge.targetType === "PRICE_RANGE"
                                  ? "Price rule"
                                  : "Custom targeting"}
                              </Text>
                            </BlockStack>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <InlineStack gap="200">
                              <PolarisBadge
                                tone={badge.enabled ? "success" : "subdued"}
                              >
                                {badge.enabled ? "Live" : "Disabled"}
                              </PolarisBadge>

                              <Button
                                size="micro"
                                onClick={() => handleToggleBadge(badge)}
                              >
                                {badge.enabled ? "Disable" : "Enable"}
                              </Button>
                            </InlineStack>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <PolarisBadge tone="info">
                              {badge.targetType === "GLOBAL"
                                ? "Storewide"
                                : String(badge.targetType || "")
                                    .replaceAll("_", " ")
                                    .toLowerCase()}
                            </PolarisBadge>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <PolarisBadge tone="attention">
                              {badge.priority}
                            </PolarisBadge>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <BlockStack gap="050">
                              <Text variant="bodySm">
                                {Number(badge.impressions || 0).toLocaleString()} impressions
                              </Text>
                              <Text variant="bodySm" tone="subdued">
                                {Number(badge.clicks || 0).toLocaleString()} clicks · {ctr}% CTR
                              </Text>
                            </BlockStack>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <InlineStack gap="100">
                              <Tooltip content="Edit badge">
                                <Button
                                  icon={EditIcon}
                                  size="micro"
                                  onClick={() => handleOpenModal(badge)}
                                />
                              </Tooltip>

                              <Tooltip content="Duplicate badge">
                                <Button
                                  icon={DuplicateIcon}
                                  size="micro"
                                  onClick={() => handleDuplicate(badge.id)}
                                />
                              </Tooltip>

                              <Tooltip content="Delete badge">
                                <Button
                                  icon={DeleteIcon}
                                  tone="critical"
                                  size="micro"
                                  onClick={() => handleDelete(badge.id)}
                                />
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

            {/* ANALYTICS TAB */}
            {selectedTab === 1 && (
              <BlockStack gap="500">
                <BlockStack gap="100">
                  <Text variant="headingLg">Conversion insights</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Performance collected from your storefront badge events.
                  </Text>
                </BlockStack>

                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400">
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued">Impressions</Text>
                        <Text variant="headingLg">
                          {Number(analytics.totalImpressions || 0).toLocaleString()}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400">
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued">Clicks</Text>
                        <Text variant="headingLg">
                          {Number(analytics.totalClicks || 0).toLocaleString()}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400">
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued">CTR</Text>
                        <Text variant="headingLg">{analytics.avgCtr || "0.00"}%</Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Card padding="400">
                      <BlockStack gap="200">
                        <Text variant="bodySm" tone="subdued">Conversions</Text>
                        <Text variant="headingLg">
                          {Number(analytics.totalConversions || 0).toLocaleString()}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                </Grid>

                <Card padding="500">
                  <BlockStack gap="400">
                    <Text variant="headingMd">Campaign performance</Text>
                    <Divider />
                    {badges.length === 0 ? (
                      <Text tone="subdued">No campaign data yet.</Text>
                    ) : (
                      badges.map((badge) => {
                        const ctr =
                          badge.impressions > 0
                            ? ((badge.clicks / badge.impressions) * 100).toFixed(2)
                            : "0.00";

                        return (
                          <InlineStack
                            key={badge.id}
                            align="space-between"
                            blockAlign="center"
                          >
                            <InlineStack gap="300">
                              <PolarisBadge
                                tone={badge.enabled ? "success" : "subdued"}
                              >
                                {badge.enabled ? "LIVE" : "OFF"}
                              </PolarisBadge>
                              <Text fontWeight="semibold">{badge.name}</Text>
                            </InlineStack>

                            <Text>
                              {badge.impressions || 0} impressions ·{" "}
                              {badge.clicks || 0} clicks · {ctr}% CTR
                            </Text>
                          </InlineStack>
                        );
                      })
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>
            )}

            {/* SETTINGS TAB */}
            {selectedTab === 2 && (
              <BlockStack gap="500">
                <BlockStack gap="100">
                  <Text variant="headingLg">Store settings</Text>
                  <Text variant="bodyMd" tone="subdued">
                    Configure global styling applied to storefront badges.
                  </Text>
                </BlockStack>

                <Card padding="500">
                  <BlockStack gap="400">
                    <Text variant="headingMd">Global custom CSS</Text>
                    <Text variant="bodySm" tone="subdued">
                      Optional CSS that will be loaded by the storefront badge engine.
                    </Text>

                    <TextField
                      label="Custom CSS"
                      value={globalCssState}
                      onChange={setGlobalCssState}
                      multiline={10}
                      autoComplete="off"
                      placeholder={`.saas-engine-badge {\n  letter-spacing: 0.5px;\n}`}
                    />

                    <InlineStack align="end">
                      <Button
                        variant="primary"
                        loading={isSaving}
                        onClick={handleSaveSettings}
                      >
                        Save settings
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>

                <Card padding="500">
                  <BlockStack gap="300">
                    <Text variant="headingMd">Store status</Text>
                    <InlineStack align="space-between">
                      <Text>Badge engine</Text>
                      <PolarisBadge tone="success">Connected</PolarisBadge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Active campaigns</Text>
                      <Text fontWeight="bold">{activeBadges.length}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text>Disabled campaigns</Text>
                      <Text fontWeight="bold">{disabledBadges.length}</Text>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            )}
          </Box>
        </Card>

        {/* MODAL */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            formData.id === "new"
              ? "Create badge campaign"
              : `Edit ${formData.name}`
          }
          primaryAction={{
            content: formData.enabled ? "Save & publish" : "Save as disabled",
            onAction: handleSaveForm,
            loading: isSaving,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setModalOpen(false),
            },
          ]}
          size="large"
        >
          <Modal.Section>
            <Grid>
              {/* LEFT EDITOR */}
              <Grid.Cell columnSpan={{ xs: 12, sm: 7, md: 7, lg: 7, xl: 7 }}>
                <BlockStack gap="500">
                  <Card padding="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="headingMd">Campaign status</Text>
                        <Text variant="bodySm" tone="subdued">
                          Control whether this badge can appear on your storefront.
                        </Text>
                      </BlockStack>
                      <Checkbox
                        label={formData.enabled ? "Enabled" : "Disabled"}
                        checked={formData.enabled}
                        onChange={(value) => updateForm("enabled", value)}
                      />
                    </InlineStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Quick styles</Text>
                      <InlineStack gap="200" wrap>
                        <Button onClick={() => handleApplyPreset("BLACK_FRIDAY")}>
                          Black Friday
                        </Button>
                        <Button onClick={() => handleApplyPreset("URGENCY")}>
                          Urgency
                        </Button>
                        <Button onClick={() => handleApplyPreset("MINIMAL")}>
                          Minimal
                        </Button>
                        <Button onClick={() => handleApplyPreset("ECO")}>
                          Eco
                        </Button>
                        <Button onClick={() => handleApplyPreset("HOT_SALE")}>
                          Hot Sale
                        </Button>
                        <Button onClick={() => handleApplyPreset("BEST_SELLER")}>
                          Best Seller
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Badge content</Text>
                      <TextField
                        label="Internal campaign name"
                        value={formData.name}
                        onChange={(value) => updateForm("name", value)}
                        autoComplete="off"
                      />
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 8, sm: 8, md: 8, lg: 8, xl: 8 }}>
                          <TextField
                            label="Badge text"
                            value={formData.text}
                            onChange={(value) => updateForm("text", value)}
                            autoComplete="off"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField
                            label="Icon"
                            value={formData.icon}
                            onChange={(value) => updateForm("icon", value)}
                            autoComplete="off"
                          />
                        </Grid.Cell>
                      </Grid>
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <Text variant="headingMd">Appearance</Text>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField
                            label="Background"
                            type="color"
                            value={formData.bgColor}
                            onChange={(value) => updateForm("bgColor", value)}
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField
                            label="Text"
                            type="color"
                            value={formData.textColor}
                            onChange={(value) => updateForm("textColor", value)}
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                          <TextField
                            label="Border"
                            type="color"
                            value={formData.borderColor}
                            onChange={(value) => updateForm("borderColor", value)}
                          />
                        </Grid.Cell>
                      </Grid>

                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                          <Select
                            label="Shape"
                            options={[
                              { label: "Pill", value: "PILL" },
                              { label: "Sharp", value: "SHARP" },
                              { label: "Outline", value: "OUTLINE" },
                              { label: "Glassmorphism", value: "GLASSMORPHISM" },
                              { label: "Ribbon", value: "RIBBON" },
                              { label: "Floating glow", value: "FLOATING_GLOW" },
                            ]}
                            value={formData.shape}
                            onChange={(value) => updateForm("shape", value)}
                          />
                        </Grid.Cell>

                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                          <Select
                            label="Position"
                            options={[
                              { label: "Top left", value: "TOP_LEFT" },
                              { label: "Top right", value: "TOP_RIGHT" },
                              { label: "Bottom left", value: "BOTTOM_LEFT" },
                              { label: "Bottom right", value: "BOTTOM_RIGHT" },
                              { label: "Center overlay", value: "CENTER_OVERLAY" },
                            ]}
                            value={formData.position}
                            onChange={(value) => updateForm("position", value)}
                          />
                        </Grid.Cell>
                      </Grid>

                      <RangeSlider
                        label={`Font size: ${formData.fontSize}px`}
                        value={formData.fontSize}
                        min={8}
                        max={24}
                        step={1}
                        onChange={(value) => updateForm("fontSize", value)}
                        output
                      />

                      <Select
                        label="Font weight"
                        options={[
                          { label: "Regular", value: "400" },
                          { label: "Medium", value: "500" },
                          { label: "Semi bold", value: "600" },
                          { label: "Bold", value: "bold" },
                          { label: "Extra bold", value: "800" },
                        ]}
                        value={formData.fontWeight}
                        onChange={(value) => updateForm("fontWeight", value)}
                      />

                      <RangeSlider
                        label={`Horizontal padding: ${formData.paddingX}px`}
                        value={formData.paddingX}
                        min={4}
                        max={30}
                        step={1}
                        onChange={(value) => updateForm("paddingX", value)}
                        output
                      />

                      <RangeSlider
                        label={`Vertical padding: ${formData.paddingY}px`}
                        value={formData.paddingY}
                        min={2}
                        max={16}
                        step={1}
                        onChange={(value) => updateForm("paddingY", value)}
                        output
                      />

                      <RangeSlider
                        label={`Border radius: ${formData.borderRadius}px`}
                        value={formData.borderRadius}
                        min={0}
                        max={50}
                        step={1}
                        onChange={(value) => updateForm("borderRadius", value)}
                        output
                      />
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="400">
                      <BlockStack gap="100">
                        <Text variant="headingMd">Targeting</Text>
                        <Text variant="bodySm" tone="subdued">
                          Decide which products can receive this badge.
                        </Text>
                      </BlockStack>

                      <Select
                        label="Display condition"
                        options={[
                          { label: "All products", value: "GLOBAL" },
                          { label: "Specific products", value: "SPECIFIC_PRODUCTS" },
                          { label: "Product tags", value: "PRODUCT_TAGS" },
                          { label: "Inventory level", value: "INVENTORY_LEVEL" },
                          { label: "Price range", value: "PRICE_RANGE" },
                        ]}
                        value={formData.targetType}
                        onChange={(value) => updateForm("targetType", value)}
                      />

                      {formData.targetType === "SPECIFIC_PRODUCTS" && (
                        <Card background="bg-surface-secondary" padding="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text>
                              {(formData.productIds || []).length} products selected
                            </Text>
                            <Button onClick={handleResourcePicker}>
                              Choose products
                            </Button>
                          </InlineStack>
                        </Card>
                      )}

                      {formData.targetType === "PRODUCT_TAGS" && (
                        <TextField
                          label="Product tags"
                          value={formData.targetTags}
                          onChange={(value) => updateForm("targetTags", value)}
                          placeholder="sale, limited, trending"
                          helpText="Separate multiple tags with commas."
                        />
                      )}

                      {formData.targetType === "INVENTORY_LEVEL" && (
                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <TextField
                              label="Minimum stock"
                              type="number"
                              value={String(formData.minInventory)}
                              onChange={(value) =>
                                updateForm("minInventory", Number(value || 0))
                              }
                            />
                          </Grid.Cell>

                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <TextField
                              label="Maximum stock"
                              type="number"
                              value={String(formData.maxInventory)}
                              onChange={(value) =>
                                updateForm("maxInventory", Number(value || 0))
                              }
                            />
                          </Grid.Cell>
                        </Grid>
                      )}

                      {formData.targetType === "PRICE_RANGE" && (
                        <Grid>
                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <TextField
                              label="Minimum price"
                              type="number"
                              value={String(formData.minPrice)}
                              onChange={(value) =>
                                updateForm("minPrice", Number(value || 0))
                              }
                            />
                          </Grid.Cell>

                          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <TextField
                              label="Maximum price"
                              type="number"
                              value={String(formData.maxPrice)}
                              onChange={(value) =>
                                updateForm("maxPrice", Number(value || 0))
                              }
                            />
                          </Grid.Cell>
                        </Grid>
                      )}
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <Text variant="headingMd">Device visibility</Text>
                      <Checkbox
                        label="Show on mobile devices"
                        checked={!formData.hideOnMobile}
                        onChange={(value) => updateForm("hideOnMobile", !value)}
                      />
                      <Checkbox
                        label="Show on desktop devices"
                        checked={!formData.hideOnDesktop}
                        onChange={(value) => updateForm("hideOnDesktop", !value)}
                      />
                    </BlockStack>
                  </Card>

                  <Card padding="400">
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="headingMd">Advanced settings</Text>
                          <Text variant="bodySm" tone="subdued">
                            Priority, scheduling and custom CSS.
                          </Text>
                        </BlockStack>

                        <Button onClick={() => setShowAdvanced(!showAdvanced)}>
                          {showAdvanced ? "Hide" : "Show"}
                        </Button>
                      </InlineStack>

                      {showAdvanced && (
                        <BlockStack gap="400">
                          <Divider />
                          <TextField
                            label="Conflict priority"
                            type="number"
                            value={String(formData.priority)}
                            onChange={(value) =>
                              updateForm("priority", Number(value || 0))
                            }
                            helpText="Higher priority wins when multiple badges target the same product."
                          />

                          <Grid>
                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                              <TextField
                                label="Start date"
                                type="date"
                                value={formData.startDate}
                                onChange={(value) => updateForm("startDate", value)}
                              />
                            </Grid.Cell>

                            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                              <TextField
                                label="End date"
                                type="date"
                                value={formData.endDate}
                                onChange={(value) => updateForm("endDate", value)}
                              />
                            </Grid.Cell>
                          </Grid>

                          <TextField
                            label="Custom CSS"
                            value={formData.customCss}
                            onChange={(value) => updateForm("customCss", value)}
                            multiline={5}
                            autoComplete="off"
                            placeholder={`box-shadow: 0 0 15px rgba(0,0,0,.2);`}
                          />
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Card>
                </BlockStack>
              </Grid.Cell>

              {/* RIGHT PREVIEW */}
              <Grid.Cell columnSpan={{ xs: 12, sm: 5, md: 5, lg: 5, xl: 5 }}>
                <Box style={{ position: "sticky", top: "16px" }}>
                  <Card padding="400">
                    <BlockStack gap="400">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="headingMd">Live preview</Text>
                          <Text variant="bodySm" tone="subdued">
                            Preview changes before publishing.
                          </Text>
                        </BlockStack>

                        <InlineStack gap="100">
                          <Button
                            size="micro"
                            pressed={previewTheme === "light"}
                            onClick={() => setPreviewTheme("light")}
                          >
                            Light
                          </Button>
                          <Button
                            size="micro"
                            pressed={previewTheme === "dark"}
                            onClick={() => setPreviewTheme("dark")}
                          >
                            Dark
                          </Button>
                        </InlineStack>
                      </InlineStack>

                      <Box
                        padding="600"
                        borderRadius="300"
                        style={{
                          minHeight: "320px",
                          background:
                            previewTheme === "light"
                              ? "linear-gradient(135deg,#f8fafc,#e5e7eb)"
                              : "linear-gradient(135deg,#111827,#030712)",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "230px",
                            minHeight: "280px",
                            background:
                              previewTheme === "light" ? "#ffffff" : "#1f2937",
                            borderRadius: "16px",
                            overflow: "hidden",
                            boxShadow: "0 20px 50px rgba(0,0,0,.18)",
                            position: "relative",
                          }}
                        >
                          <div
                            style={{
                              height: "175px",
                              background:
                                previewTheme === "light"
                                  ? "linear-gradient(135deg,#e5e7eb,#cbd5e1)"
                                  : "linear-gradient(135deg,#374151,#111827)",
                              position: "relative",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "105px",
                                height: "135px",
                                borderRadius: "12px",
                                background:
                                  previewTheme === "light"
                                    ? "#f8fafc"
                                    : "#4b5563",
                                boxShadow: "0 15px 30px rgba(0,0,0,.18)",
                              }}
                            />

                            <div
                              style={{
                                position: "absolute",
                                ...(safePosition.includes("TOP")
                                  ? { top: "10px" }
                                  : { bottom: "10px" }),
                                ...(safePosition.includes("LEFT")
                                  ? { left: "10px" }
                                  : safePosition.includes("RIGHT")
                                  ? { right: "10px" }
                                  : {
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                    }),
                              }}
                            >
                              <div style={previewBadgeStyle}>
                                {formData.icon && <span>{formData.icon}</span>}
                                <span>{formData.text || "BADGE"}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: "14px" }}>
                            <div
                              style={{
                                height: "10px",
                                width: "75%",
                                background:
                                  previewTheme === "light"
                                    ? "#d1d5db"
                                    : "#4b5563",
                                borderRadius: "999px",
                                marginBottom: "9px",
                              }}
                            />
                            <div
                              style={{
                                height: "13px",
                                width: "45%",
                                background:
                                  previewTheme === "light"
                                    ? "#111827"
                                    : "#f9fafb",
                                borderRadius: "999px",
                              }}
                            />
                          </div>
                        </div>
                      </Box>

                      <InlineStack align="space-between">
                        <Text variant="bodySm" tone="subdued">
                          Status
                        </Text>
                        <PolarisBadge
                          tone={formData.enabled ? "success" : "subdued"}
                        >
                          {formData.enabled ? "Ready to publish" : "Disabled"}
                        </PolarisBadge>
                      </InlineStack>
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