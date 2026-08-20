import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Box,
  Badge,
  Button,
  Grid,
  Banner,
  List,
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

export default function WidgetShowcase() {
  const navigate = useNavigate();

  const showcases = [
    {
      id: 1,
      title: "Flash Sale & Urgency Badges",
      subtitle: "Drive immediate buyer action with high-visibility urgency labels",
      badgeText: "🔥 50% OFF",
      badgeBg: "#DC2626",
      badgeColor: "#FFFFFF",
      shape: "pill",
      description:
        "Designed for limited-time offers, clearance events, and daily deals. Prominently catches customer attention on high-traffic collection grids and search result pages.",
      highlights: [
        "Increases Add-to-Cart velocity by leveraging FOMO (Fear Of Missing Out)",
        "Supports dynamic emoji prefix icons (Fire, Star, Bolt, Gift)",
        "Multiple positioning options: Top-Left, Top-Right, or Center Overlay",
      ],
    },
    {
      id: 2,
      title: "Social Proof & Best Sellers",
      subtitle: "Build instant trust using sales status and top-rated badges",
      badgeText: "⭐ BESTSELLER",
      badgeBg: "#D97706",
      badgeColor: "#FFFFFF",
      shape: "ribbon",
      description:
        "Showcase top-performing items automatically. Highlight customer favorites, staff picks, and popular collections directly on product cards.",
      highlights: [
        "Establishes immediate buyer confidence for first-time store visitors",
        "Sleek Ribbon & Sharp corner styles tailored for modern catalog aesthetics",
        "Inherits theme typography for a seamless native storefront look",
      ],
    },
    {
      id: 3,
      title: "Inventory & Low Stock Alerts",
      subtitle: "Scarcity marketing that accelerates checkout decisions",
      badgeText: "⚡ ONLY 3 LEFT",
      badgeBg: "#111827",
      badgeColor: "#FBBF24",
      shape: "outline",
      description:
        "Trigger rapid purchasing decisions by displaying low stock notices. Designed with subtle outline borders or high-contrast solid fills.",
      highlights: [
        "Subtle outline & sharp corner styles suitable for luxury brand design",
        "Granular font scaling from 9px to 18px",
        "Fully responsive on Desktop, Tablet, and Mobile viewports",
      ],
    },
    {
      id: 4,
      title: "Rule-Based Product Targeting",
      subtitle: "Assign distinct badges globally or to specific products",
      badgeText: "🎁 GIFT IDEA",
      badgeBg: "#059669",
      badgeColor: "#FFFFFF",
      shape: "pill",
      description:
        "Granular control over badge distribution. Attach unique labels to individual product IDs using Shopify's native Resource Picker.",
      highlights: [
        "Target specific products or apply globally with 1 click",
        "Multi-badge management (Bestseller, Hot Deal, Limited Stock)",
        "Instant sync without touching Liquid theme files",
      ],
    },
    {
      id: 5,
      title: "Real-Time CTR & Impression Analytics",
      subtitle: "Track performance and measure ROI directly in app",
      badgeText: "📊 26.8% CTR",
      badgeBg: "#2563EB",
      badgeColor: "#FFFFFF",
      shape: "pill",
      description:
        "Data-driven optimization. Monitor view counts and click interactions for every active badge to continuously improve store conversion rates.",
      highlights: [
        "Automated view & click count logging via Shopify App Proxy",
        "Calculates real-time Click-Through Rate (CTR) in your app dashboard",
        "Zero store speed impact (<4KB lightweight script footprint)",
      ],
    },
  ];

  return (
    <Page
      title="Widget Showcase & Listing Preview"
      subtitle="Explore all badge styles, visual presets, and conversion features available in Custom Badges Pro."
      primaryAction={{
        content: "Customize Badges",
        onAction: () => navigate("/app"),
      }}
    >
      <BlockStack gap="500">
        {/* Top Header Banner */}
        <Banner tone="info" title="High-Converting Storefront Widget System">
          <p>
            Custom Badges Pro gives you full control over how badges display on your storefront grids and product cards. Choose from multiple shapes, icon prefixes, color schemes, and targeting rules.
          </p>
        </Banner>

        {/* Showcase Items Listing */}
        {showcases.map((item, index) => (
          <Card key={item.id}>
            <Grid>
              {/* Left Column: Interactive Product Card Visual Preview */}
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 5, lg: 5, xl: 5 }}>
                <Box
                  padding="400"
                  borderRadius="300"
                  style={{
                    backgroundColor: "#F1F5F9",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    minHeight: "230px",
                    border: "1px dashed #CBD5E1",
                  }}
                >
                  <div
                    style={{
                      width: "200px",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {/* Simulated Image Box with Live Rendered Badge */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "140px",
                        backgroundColor: "#F8FAFC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>

                      {/* Rendered Badge Preview */}
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          backgroundColor:
                            item.shape === "outline" ? "transparent" : item.badgeBg,
                          color:
                            item.shape === "outline" ? item.badgeBg : item.badgeColor,
                          border:
                            item.shape === "outline"
                              ? `2px solid ${item.badgeBg}`
                              : "none",
                          borderRadius:
                            item.shape === "sharp"
                              ? "0px"
                              : item.shape === "ribbon"
                              ? "0 8px 8px 0"
                              : "20px",
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "0.5px",
                          boxShadow:
                            item.shape === "outline"
                              ? "none"
                              : "0 4px 6px -1px rgba(0,0,0,0.15)",
                          zIndex: 10,
                        }}
                      >
                        {item.badgeText}
                      </div>
                    </div>

                    {/* Simulated Product Info Skeleton */}
                    <div style={{ padding: "10px" }}>
                      <div
                        style={{
                          height: "10px",
                          width: "80%",
                          backgroundColor: "#CBD5E1",
                          borderRadius: "4px",
                          marginBottom: "6px",
                        }}
                      />
                      <div
                        style={{
                          height: "12px",
                          width: "45%",
                          backgroundColor: "#0F172A",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                </Box>
              </Grid.Cell>

              {/* Right Column: Listing Details & Features */}
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 7, lg: 7, xl: 7 }}>
                <Box padding="200">
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="accent">Listing Style #{index + 1}</Badge>
                        <Text as="h2" variant="headingMd">
                          {item.title}
                        </Text>
                      </InlineStack>
                    </InlineStack>

                    <Text as="p" variant="bodySm" tone="subdued">
                      {item.subtitle}
                    </Text>

                    <Divider />

                    <Text as="p" variant="bodyMd">
                      {item.description}
                    </Text>

                    <Text as="h3" variant="headingSm">
                      Key Capabilities & Benefits:
                    </Text>
                    <List type="bullet">
                      {item.highlights.map((point, pIdx) => (
                        <List.Item key={pIdx}>{point}</List.Item>
                      ))}
                    </List>

                    <Box paddingBlockStart="200">
                      <Button
                        variant="secondary"
                        onClick={() => navigate("/app")}
                      >
                        Configure This Style
                      </Button>
                    </Box>
                  </BlockStack>
                </Box>
              </Grid.Cell>
            </Grid>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}