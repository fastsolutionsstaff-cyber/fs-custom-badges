import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Banner,
  List,
  Badge,
  InlineStack,
  Box,
  Divider,
  Button,
} from "@shopify/polaris";
import { useState } from "react";

export default function ProductLabelGuide() {
  const [selectedShape, setSelectedShape] = useState("pill");
  const [selectedColor, setSelectedColor] = useState("#111111");

  return (
    <Page
      title="Product Page Labels Guide & Showcase"
      subtitle="Learn how to add and customize dynamic labels on your Product Detail Pages (PDP)"
      compactTitle
    >
      <BlockStack gap="500">
        {/* Top Info Banner */}
        <Banner title="Theme Editor Integration" status="info">
          <p>
            Product Labels use Shopify's native Theme App Blocks. You can customize fonts, colors, padding, and shapes directly inside your Shopify Theme Editor with live preview!
          </p>
        </Banner>

        <Layout>
          {/* Main Setup Instructions */}
          <Layout.Section>
            <Card padding="500">
              <BlockStack gap="400">
                <Text variant="headingLg" as="h2">
                  🚀 How to Enable Labels on Product Pages
                </Text>

                <Divider />

                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">
                    Step 1: Open Shopify Theme Editor
                  </Text>
                  <Text as="p" tone="subdued">
                    Go to <strong>Online Store → Themes</strong> in your Shopify Admin, and click <strong>Customize</strong> on your active theme.
                  </Text>

                  <Text variant="headingMd" as="h3">
                    Step 2: Navigate to Product Template
                  </Text>
                  <Text as="p" tone="subdued">
                    From the top page selector dropdown, switch from <em>Default Page</em> to <strong>Products → Default product</strong>.
                  </Text>

                  <Text variant="headingMd" as="h3">
                    Step 3: Add "Product Badge Label" Block
                  </Text>
                  <List type="number">
                    <List.Item>In the left sidebar, find the <strong>Product Information</strong> section.</List.Item>
                    <List.Item>Click <strong>Add Block</strong> at the bottom of the section list.</List.Item>
                    <List.Item>Switch to the <strong>Apps</strong> tab and select <strong>Product Badge Label</strong>.</List.Item>
                  </List>

                  <Text variant="headingMd" as="h3">
                    Step 4: Position & Customize
                  </Text>
                  <Text as="p" tone="subdued">
                    Drag the block up or down (e.g., right above the Product Title or below the Price). Click on the block settings to tweak background colors, font size, margin spacing, and badge shapes!
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Interactive Live Showcase / Preview */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    ✨ Label Styles Showcase
                  </Text>
                  <Text tone="subdued" as="p">
                    Preview how labels look with different shape presets:
                  </Text>

                  {/* Preset Shapes Selector Buttons */}
                  <InlineStack gap="200">
                    <Button
                      pressed={selectedShape === "pill"}
                      onClick={() => setSelectedShape("pill")}
                      size="slim"
                    >
                      Pill
                    </Button>
                    <Button
                      pressed={selectedShape === "rounded"}
                      onClick={() => setSelectedShape("rounded")}
                      size="slim"
                    >
                      Rounded
                    </Button>
                    <Button
                      pressed={selectedShape === "sharp"}
                      onClick={() => setSelectedShape("sharp")}
                      size="slim"
                    >
                      Sharp
                    </Button>
                    <Button
                      pressed={selectedShape === "outline"}
                      onClick={() => setSelectedShape("outline")}
                      size="slim"
                    >
                      Outline
                    </Button>
                  </InlineStack>

                  {/* Live Render Preview Container */}
                  <Box
                    padding="600"
                    background="bg-surface-secondary"
                    borderRadius="300"
                  >
                    <BlockStack gap="300" align="center">
                      <Text variant="bodySm" tone="subdued">
                        Mock Product Detail Page
                      </Text>

                      {/* Mock Label */}
                      <div
                        style={{
                          backgroundColor:
                            selectedShape === "outline" ? "transparent" : selectedColor,
                          color: selectedShape === "outline" ? selectedColor : "#ffffff",
                          border:
                            selectedShape === "outline"
                              ? `2px solid ${selectedColor}`
                              : "none",
                          borderRadius:
                            selectedShape === "pill"
                              ? "50px"
                              : selectedShape === "rounded"
                              ? "6px"
                              : selectedShape === "sharp"
                              ? "0px"
                              : "6px",
                          padding: "6px 14px",
                          fontWeight: "700",
                          fontSize: "12px",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          boxShadow:
                            selectedShape === "outline"
                              ? "none"
                              : "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        🔥 BESTSELLER
                      </div>

                      <Text variant="headingLg" as="h3">
                        iPhone 17 Pro Max
                      </Text>
                      <Text variant="headingMd" tone="subdued">
                        $1,199.00
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Card>

              {/* Quick Status Info */}
              <Card padding="400">
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h4">
                    Targeting Logic
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    If a product has a targeted badge active in your app dashboard, the label block will automatically display that badge's text & icon for that specific product!
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}