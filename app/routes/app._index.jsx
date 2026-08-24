import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
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
} from "@shopify/polaris";
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  DuplicateIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server.js";
import db from "../db.server.js";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await db.appSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await db.appSettings.create({ data: { shop } });
  }

  let badges = await db.badge.findMany({
    where: { shop },
    include: { products: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  if (badges.length === 0) {
    const defaultBadge = await db.badge.create({
      data: {
        shop,
        name: "Black Friday High Conversion",
        text: "LIMITED DEAL",
        bgColor: "#DC2626",
        textColor: "#FFFFFF",
        borderColor: "#991B1B",
        position: "TOP_LEFT",
        shape: "PILL",
        icon: "⚡",
        targetType: "GLOBAL",
        priority: 10,
        enabled: true,
        hideOnMobile: false,
        hideOnDesktop: false,
      },
      include: { products: true },
    });
    badges = [defaultBadge];
  }

  const formattedBadges = badges.map((b) => ({
    ...b,
    productIds: b.products.map((p) => p.productId),
  }));

  const totalImpressions = formattedBadges.reduce((acc, b) => acc + (b.impressions || 0), 0);
  const totalClicks = formattedBadges.reduce((acc, b) => acc + (b.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  return json({ shop, settings, badges: formattedBadges, analytics: { totalImpressions, totalClicks, avgCtr } });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "DELETE") {
    const id = formData.get("id");
    await db.badge.delete({ where: { id, shop } });
    return json({ success: true, message: "Badge campaign deleted permanently." });
  }

  if (intent === "DUPLICATE") {
    const id = formData.get("id");
    const existing = await db.badge.findUnique({ where: { id, shop } });
    if (existing) {
      const { id: _, createdAt: __, updatedAt: ___, ...dataToCopy } = existing;
      await db.badge.create({
        data: { ...dataToCopy, name: `${existing.name} (Copy)` }
      });
    }
    return json({ success: true, message: "Badge cloned successfully." });
  }

  if (intent === "SAVE_SETTINGS") {
    const globalCustomCss = formData.get("globalCustomCss") || "";
    await db.appSettings.update({
      where: { shop },
      data: { globalCustomCss }
    });
    return json({ success: true, message: "Global configurations saved." });
  }

  // SAVE BADGE RULE
  const id = formData.get("id");
  const name = formData.get("name") || "Untitled Campaign";
  const enabled = formData.get("enabled") === "true";
  const text = formData.get("text") || "BADGE";
  const bgColor = formData.get("bgColor") || "#111827";
  const textColor = formData.get("textColor") || "#FFFFFF";
  const borderColor = formData.get("borderColor") || "#000000";
  const position = formData.get("position") || "TOP_LEFT";
  const shape = formData.get("shape") || "PILL";
  const icon = formData.get("icon") || "";
  const fontSize = parseInt(formData.get("fontSize") || "11", 10);
  const paddingX = parseInt(formData.get("paddingX") || "10", 10);
  const paddingY = parseInt(formData.get("paddingY") || "4", 10);
  const borderRadius = parseInt(formData.get("borderRadius") || "20", 10);
  const priority = parseInt(formData.get("priority") || "0", 10);
  const targetType = formData.get("targetType") || "GLOBAL";
  const targetTags = formData.get("targetTags") || "";
  const minInventory = parseInt(formData.get("minInventory") || "0", 10);
  const maxInventory = parseInt(formData.get("maxInventory") || "9999", 10);
  const minPrice = parseFloat(formData.get("minPrice") || "0");
  const maxPrice = parseFloat(formData.get("maxPrice") || "99999");
  const customCss = formData.get("customCss") || "";
  const hideOnMobile = formData.get("hideOnMobile") === "true";
  const hideOnDesktop = formData.get("hideOnDesktop") === "true";
  const productIds = JSON.parse(formData.get("productIds") || "[]");

  await db.$transaction(async (tx) => {
    let badge;
    const payload = {
      shop,
      name,
      enabled,
      text,
      bgColor,
      textColor,
      borderColor,
      position,
      shape,
      icon,
      fontSize,
      paddingX,
      paddingY,
      borderRadius,
      priority,
      targetType,
      targetTags,
      minInventory,
      maxInventory,
      minPrice,
      maxPrice,
      customCss,
      hideOnMobile,
      hideOnDesktop,
    };

    if (id && id !== "new") {
      badge = await tx.badge.update({ where: { id, shop }, data: payload });
    } else {
      badge = await tx.badge.create({ data: payload });
    }

    await tx.badgeProduct.deleteMany({ where: { badgeId: badge.id } });
    if (targetType === "SPECIFIC_PRODUCTS" && productIds.length > 0) {
      await tx.badgeProduct.createMany({
        data: productIds.map((pId) => ({ badgeId: badge.id, productId: pId })),
      });
    }
  });

  return json({ success: true, message: "Campaign rule updated across storefront." });
};

export default function SaaSAdminApp() {
  const { settings, badges, analytics } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selectedTab, setSelectedTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [globalCssState, setGlobalCssState] = useState(settings?.globalCustomCss || "");

  const [formData, setFormData] = useState({
    id: "new",
    name: "New High-Converting Campaign",
    enabled: true,
    text: "FLASH SALE",
    bgColor: "#DC2626",
    textColor: "#FFFFFF",
    borderColor: "#991B1B",
    position: "TOP_LEFT",
    shape: "PILL",
    icon: "🔥",
    fontSize: 11,
    paddingX: 10,
    paddingY: 4,
    borderRadius: 20,
    priority: 1,
    targetType: "GLOBAL",
    targetTags: "",
    minInventory: 0,
    maxInventory: 100,
    minPrice: 0,
    maxPrice: 1000,
    customCss: "",
    hideOnMobile: false,
    hideOnDesktop: false,
    productIds: []
  });

  const [previewTheme, setPreviewTheme] = useState("light");

  const handleOpenModal = (badge = null) => {
    if (badge) {
      setFormData({
        ...badge,
        hideOnMobile: badge.hideOnMobile ?? false,
        hideOnDesktop: badge.hideOnDesktop ?? false,
      });
    } else {
      setFormData({
        id: "new",
        name: `Campaign Rule #${badges.length + 1}`,
        enabled: true,
        text: "HOT SALE",
        bgColor: "#2563EB",
        textColor: "#FFFFFF",
        borderColor: "#1D4ED8",
        position: "TOP_LEFT",
        shape: "PILL",
        icon: "⚡",
        fontSize: 11,
        paddingX: 10,
        paddingY: 4,
        borderRadius: 20,
        priority: 0,
        targetType: "GLOBAL",
        targetTags: "",
        minInventory: 0,
        maxInventory: 9999,
        minPrice: 0,
        maxPrice: 99999,
        customCss: "",
        hideOnMobile: false,
        hideOnDesktop: false,
        productIds: []
      });
    }
    setModalOpen(true);
  };

  const handleApplyPreset = (presetKey) => {
    const presets = {
      BLACK_FRIDAY: { text: "BLACK FRIDAY", bgColor: "#000000", textColor: "#22C55E", borderColor: "#15803D", shape: "SHARP", icon: "⚡" },
      URGENCY: { text: "ONLY FEW LEFT", bgColor: "#EF4444", textColor: "#FFFFFF", borderColor: "#B91C1C", shape: "PILL", icon: "🚨" },
      MINIMAL: { text: "PREMIUM EDITION", bgColor: "#1F2937", textColor: "#F9FAFB", borderColor: "#374151", shape: "OUTLINE", icon: "💎" },
      ECO: { text: "100% ORGANIC", bgColor: "#059669", textColor: "#ECFDF5", borderColor: "#047857", shape: "GLASSMORPHISM", icon: "🌿" }
    };
    if (presets[presetKey]) {
      setFormData((prev) => ({ ...prev, ...presets[presetKey] }));
    }
  };

  const handleSaveForm = () => {
    const data = new FormData();
    Object.keys(formData).forEach((k) => {
      if (k === "productIds") data.append(k, JSON.stringify(formData[k]));
      else data.append(k, formData[k]?.toString() || "");
    });
    submit(data, { method: "post" });
    setModalOpen(false);
  };

  const handleDuplicate = (id) => {
    submit({ intent: "DUPLICATE", id }, { method: "post" });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to drop this production rule?")) {
      submit({ intent: "DELETE", id }, { method: "post" });
    }
  };

  const handleSaveSettings = () => {
    submit({ intent: "SAVE_SETTINGS", globalCustomCss: globalCssState }, { method: "post" });
  };

  const handleResourcePicker = async () => {
    if (typeof window !== "undefined" && window.shopify?.resourcePicker) {
      const selected = await window.shopify.resourcePicker({
        type: "product",
        multiple: true,
        selectionIds: formData.productIds.map((id) => ({ id })),
      });
      if (selected) {
        setFormData((p) => ({ ...p, productIds: selected.map((s) => s.id) }));
      }
    }
  };

  return (
    <Page
      title="Badge Studio Enterprise"
      subtitle="Algorithmic product badge automation, dynamic CTR optimization, and high-conversion targeting rules."
      primaryAction={{
        content: "Create New Rule",
        icon: PlusIcon,
        onAction: () => handleOpenModal(),
      }}
    >
      <BlockStack gap="600">
        {actionData?.message && (
          <Banner status="success" onDismiss={() => {}}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        {/* METRICS HEADER */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Active Engine Rules</Text>
                <Text variant="headingXl">{badges.filter((b) => b.enabled).length} / {badges.length}</Text>
                <PolarisBadge tone="success">Engine Online</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Storefront Badge Impressions</Text>
                <Text variant="headingXl">{analytics.totalImpressions.toLocaleString()}</Text>
                <PolarisBadge tone="info">Realtime Edge Analytics</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Storewide CTR Performance</Text>
                <Text variant="headingXl">{analytics.avgCtr}%</Text>
                <PolarisBadge tone="attention">Optimal Threshold</PolarisBadge>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* MAIN PANEL MULTI-TAB VIEW */}
        <Card padding="0">
          <Tabs
            tabs={[
              { id: "rules", content: "Campaign Rules & Automation" },
              { id: "analytics", content: "Conversion Insights" },
              { id: "settings", content: "Advanced Theme Injector" },
            ]}
            selected={selectedTab}
            onSelect={setSelectedTab}
          />
          <Box padding="500">
            {selectedTab === 0 && (
              <IndexTable
                resourceName={{ singular: "badge", plural: "badges" }}
                itemCount={badges.length}
                selectable={false}
                headings={[
                  { title: "Badge Render Preview" },
                  { title: "Campaign Name" },
                  { title: "Priority Engine" },
                  { title: "Visibility" },
                  { title: "Analytics (CTR)" },
                  { title: "Actions" },
                ]}
              >
                {badges.map((b, index) => {
                  const ctr = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(2) : "0.00";
                  return (
                    <IndexTable.Row id={b.id} key={b.id} position={index}>
                      <IndexTable.Cell>
                        <div
                          style={{
                            backgroundColor: b.shape === "OUTLINE" ? "transparent" : b.bgColor,
                            color: b.shape === "OUTLINE" ? b.bgColor : b.textColor,
                            border: `1px solid ${b.borderColor || "#000"}`,
                            borderRadius: `${b.borderRadius}px`,
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            display: "inline-block",
                          }}
                        >
                          {b.icon} {b.text}
                        </div>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <BlockStack gap="050">
                          <Text variant="bodyMd" fontWeight="bold">{b.name}</Text>
                          <PolarisBadge tone={b.enabled ? "success" : "subdued"}>
                            {b.enabled ? "Live" : "Disabled"}
                          </PolarisBadge>
                        </BlockStack>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <PolarisBadge tone="attention">Weight: {b.priority}</PolarisBadge>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack gap="100">
                          {b.hideOnMobile && <PolarisBadge tone="warn">Mobile Hidden</PolarisBadge>}
                          {b.hideOnDesktop && <PolarisBadge tone="warn">Desktop Hidden</PolarisBadge>}
                          {!b.hideOnMobile && !b.hideOnDesktop && <PolarisBadge tone="info">All Devices</PolarisBadge>}
                        </InlineStack>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text variant="bodySm">{b.clicks} / {b.impressions} ({ctr}%)</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <InlineStack gap="100">
                          <Button icon={EditIcon} onClick={() => handleOpenModal(b)} size="micro" />
                          <Button icon={DuplicateIcon} onClick={() => handleDuplicate(b.id)} size="micro" />
                          <Button icon={DeleteIcon} onClick={() => handleDelete(b.id)} tone="critical" size="micro" />
                        </InlineStack>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>
            )}

            {selectedTab === 1 && (
              <BlockStack gap="400">
                <Text variant="headingMd">Conversion & Click Tracking Analytics</Text>
                <Divider />
                <p>Realtime rule impressions vs conversion analysis engine active.</p>
              </BlockStack>
            )}

            {selectedTab === 2 && (
              <BlockStack gap="400">
                <Text variant="headingMd">Global Custom CSS Override</Text>
                <TextField
                  label="Injected Storewide Styling Engine"
                  value={globalCssState}
                  onChange={setGlobalCssState}
                  multiline={6}
                  helpText="Enter valid CSS to apply over store badges globally."
                />
                <InlineStack align="end">
                  <Button variant="primary" onClick={handleSaveSettings}>Save Engine Settings</Button>
                </InlineStack>
              </BlockStack>
            )}
          </Box>
        </Card>

        {/* MODAL STUDIO EDITOR */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={formData.id === "new" ? "Build High-Converting Campaign Rule" : `Edit Rule: ${formData.name}`}
          primaryAction={{
            content: "Publish Campaign Live",
            onAction: handleSaveForm,
            loading: navigation.state === "submitting",
          }}
          secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
          size="large"
        >
          <Modal.Section>
            <Grid>
              <Grid.Cell columnSpan={{ xs: 7, sm: 7, md: 7, lg: 7, xl: 7 }}>
                <BlockStack gap="400">
                  <Text variant="headingSm">Conversion Presets</Text>
                  <InlineStack gap="200">
                    <Button size="micro" onClick={() => handleApplyPreset("BLACK_FRIDAY")}>Black Friday</Button>
                    <Button size="micro" onClick={() => handleApplyPreset("URGENCY")}>Urgency Scarcity</Button>
                    <Button size="micro" onClick={() => handleApplyPreset("MINIMAL")}>Luxury Minimal</Button>
                    <Button size="micro" onClick={() => handleApplyPreset("ECO")}>Eco Glassmorphism</Button>
                  </InlineStack>

                  <Divider />

                  <TextField
                    label="Campaign Internal Title"
                    value={formData.name}
                    onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
                  />

                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <TextField
                        label="Display Badge Text"
                        value={formData.text}
                        onChange={(v) => setFormData((p) => ({ ...p, text: v }))}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <TextField
                        label="Emoji / Icon Prefix"
                        value={formData.icon}
                        onChange={(v) => setFormData((p) => ({ ...p, icon: v }))}
                      />
                    </Grid.Cell>
                  </Grid>

                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <TextField
                        label="Background Color"
                        type="color"
                        value={formData.bgColor}
                        onChange={(v) => setFormData((p) => ({ ...p, bgColor: v }))}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <TextField
                        label="Text Color"
                        type="color"
                        value={formData.textColor}
                        onChange={(v) => setFormData((p) => ({ ...p, textColor: v }))}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 4, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <TextField
                        label="Border Color"
                        type="color"
                        value={formData.borderColor}
                        onChange={(v) => setFormData((p) => ({ ...p, borderColor: v }))}
                      />
                    </Grid.Cell>
                  </Grid>

                  <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <Select
                        label="Badge Style & Shape"
                        options={[
                          { label: "Capsule Pill", value: "PILL" },
                          { label: "Sharp Square", value: "SHARP" },
                          { label: "Outline Minimal", value: "OUTLINE" },
                          { label: "Glassmorphism", value: "GLASSMORPHISM" },
                        ]}
                        value={formData.shape}
                        onChange={(v) => setFormData((p) => ({ ...p, shape: v }))}
                      />
                    </Grid.Cell>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                      <Select
                        label="Grid Corner Placement"
                        options={[
                          { label: "Top Left", value: "TOP_LEFT" },
                          { label: "Top Right", value: "TOP_RIGHT" },
                          { label: "Bottom Left", value: "BOTTOM_LEFT" },
                          { label: "Bottom Right", value: "BOTTOM_RIGHT" },
                        ]}
                        value={formData.position}
                        onChange={(v) => setFormData((p) => ({ ...p, position: v }))}
                      />
                    </Grid.Cell>
                  </Grid>

                  <RangeSlider
                    label="Font Size (PX)"
                    value={formData.fontSize}
                    min={8}
                    max={20}
                    onChange={(v) => setFormData((p) => ({ ...p, fontSize: v }))}
                    output
                  />

                  {/* DEVICE VISIBILITY CONTROL CHECKBOXES */}
                  <Divider />
                  <Text variant="headingSm">Device Display Settings</Text>
                  <InlineStack gap="400">
                    <Checkbox
                      label="Hide on Mobile Devices"
                      checked={formData.hideOnMobile}
                      onChange={(newVal) => setFormData((p) => ({ ...p, hideOnMobile: newVal }))}
                    />
                    <Checkbox
                      label="Hide on Desktop Devices"
                      checked={formData.hideOnDesktop}
                      onChange={(newVal) => setFormData((p) => ({ ...p, hideOnDesktop: newVal }))}
                    />
                  </InlineStack>

                  <TextField
                    label="Conflict Weight Priority (Higher Wins Overlap)"
                    type="number"
                    value={formData.priority.toString()}
                    onChange={(v) => setFormData((p) => ({ ...p, priority: parseInt(v || "0", 10) }))}
                  />

                  <Divider />
                  <Text variant="headingSm">Automated Algorithmic Targeting Engine</Text>

                  <Select
                    label="Trigger Condition"
                    options={[
                      { label: "All Products (Global Store)", value: "GLOBAL" },
                      { label: "Selected Products Manual Selection", value: "SPECIFIC_PRODUCTS" },
                      { label: "Product Tag Included", value: "PRODUCT_TAGS" },
                      { label: "Inventory Scarcity Limit", value: "INVENTORY_LEVEL" },
                      { label: "Price Range Filter", value: "PRICE_RANGE" },
                    ]}
                    value={formData.targetType}
                    onChange={(v) => setFormData((p) => ({ ...p, targetType: v }))}
                  />

                  {formData.targetType === "SPECIFIC_PRODUCTS" && (
                    <InlineStack gap="300" blockAlign="center">
                      <Button onClick={handleResourcePicker}>Select Storefront Products</Button>
                      <Text variant="bodySm">{formData.productIds.length} Items Attached</Text>
                    </InlineStack>
                  )}

                  {formData.targetType === "PRODUCT_TAGS" && (
                    <TextField
                      label="Product Tag Targets (Comma Separated)"
                      value={formData.targetTags}
                      placeholder="e.g. sale, limited, trending"
                      onChange={(v) => setFormData((p) => ({ ...p, targetTags: v }))}
                    />
                  )}

                  {formData.targetType === "INVENTORY_LEVEL" && (
                    <Grid>
                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                        <TextField
                          label="Min Stock Threshold"
                          type="number"
                          value={formData.minInventory.toString()}
                          onChange={(v) => setFormData((p) => ({ ...p, minInventory: parseInt(v || "0", 10) }))}
                        />
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                        <TextField
                          label="Max Stock Threshold"
                          type="number"
                          value={formData.maxInventory.toString()}
                          onChange={(v) => setFormData((p) => ({ ...p, maxInventory: parseInt(v || "0", 10) }))}
                        />
                      </Grid.Cell>
                    </Grid>
                  )}

                  {formData.targetType === "PRICE_RANGE" && (
                    <Grid>
                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                        <TextField
                          label="Min Price ($)"
                          type="number"
                          value={formData.minPrice.toString()}
                          onChange={(v) => setFormData((p) => ({ ...p, minPrice: parseFloat(v || "0") }))}
                        />
                      </Grid.Cell>
                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                        <TextField
                          label="Max Price ($)"
                          type="number"
                          value={formData.maxPrice.toString()}
                          onChange={(v) => setFormData((p) => ({ ...p, maxPrice: parseFloat(v || "0") }))}
                        />
                      </Grid.Cell>
                    </Grid>
                  )}

                  <TextField
                    label="Custom Badge CSS Hacks"
                    value={formData.customCss}
                    multiline={3}
                    placeholder="box-shadow: 0 0 10px rgba(255,0,0,0.5);"
                    onChange={(v) => setFormData((p) => ({ ...p, customCss: v }))}
                  />
                </BlockStack>
              </Grid.Cell>

              {/* REALTIME CANVAS EDITOR */}
              <Grid.Cell columnSpan={{ xs: 5, sm: 5, md: 5, lg: 5, xl: 5 }}>
                <Box style={{ position: "sticky", top: "0px" }}>
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text variant="headingSm">Live Store Simulator</Text>
                        <InlineStack gap="100">
                          <Button size="micro" pressed={previewTheme === "light"} onClick={() => setPreviewTheme("light")}>Light</Button>
                          <Button size="micro" pressed={previewTheme === "dark"} onClick={() => setPreviewTheme("dark")}>Dark</Button>
                        </InlineStack>
                      </InlineStack>

                      <Box
                        padding="600"
                        borderRadius="300"
                        style={{
                          backgroundColor: previewTheme === "light" ? "#F3F4F6" : "#111827",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: "280px",
                        }}
                      >
                        <div
                          style={{
                            width: "200px",
                            height: "240px",
                            backgroundColor: previewTheme === "light" ? "#FFFFFF" : "#1F2937",
                            borderRadius: "12px",
                            overflow: "hidden",
                            position: "relative",
                            border: previewTheme === "light" ? "1px solid #E5E7EB" : "1px solid #374151",
                          }}
                        >
                          <div style={{ width: "100%", height: "150px", backgroundColor: previewTheme === "light" ? "#E5E7EB" : "#374151", position: "relative" }}>
                            <div
                              style={{
                                position: "absolute",
                                backgroundColor: formData.shape === "OUTLINE" ? "transparent" : formData.bgColor,
                                color: formData.shape === "OUTLINE" ? formData.bgColor : formData.textColor,
                                border: `1px solid ${formData.borderColor}`,
                                borderRadius: formData.shape === "PILL" ? "20px" : formData.shape === "SHARP" ? "0px" : `${formData.borderRadius}px`,
                                padding: `${formData.paddingY}px ${formData.paddingX}px`,
                                fontSize: `${formData.fontSize}px`,
                                fontWeight: "bold",
                                top: formData.position.includes("TOP") ? "8px" : "auto",
                                bottom: formData.position.includes("BOTTOM") ? "8px" : "auto",
                                left: formData.position.includes("LEFT") ? "8px" : "auto",
                                right: formData.position.includes("RIGHT") ? "8px" : "auto",
                                backdropFilter: formData.shape === "GLASSMORPHISM" ? "blur(8px)" : "none",
                              }}
                            >
                              {formData.icon} {formData.text}
                            </div>
                          </div>
                          <div style={{ padding: "10px" }}>
                            <div style={{ height: "10px", width: "80%", backgroundColor: previewTheme === "light" ? "#D1D5DB" : "#4B5563", borderRadius: "4px", marginBottom: "6px" }} />
                            <div style={{ height: "12px", width: "40%", backgroundColor: previewTheme === "light" ? "#111827" : "#F9FAFB", borderRadius: "4px" }} />
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