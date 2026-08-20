import { Page, Layout, Card, BlockStack, Text, Divider, Box, InlineStack, Button, List, Badge } from "@shopify/polaris";

export default function HowItWorks() {
  return (
    <Page title="How It Works" subtitle="Step-by-step guide to customizing, targeting, and publishing badges.">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">App Setup Roadmap</Text>
                <Text as="p" variant="bodyMd">Follow these 3 simple steps to display badges live on your store product grid.</Text>
                
                <Divider />

                {/* Step 1 */}
                <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone="info">Step 1</Badge>
                      <Text as="h3" variant="headingMd">Configure Badge Design & Targeting</Text>
                    </InlineStack>
                    <List type="bullet">
                      <List.Item>Go to the <strong>Badge Customizer & Rules</strong> tab on the dashboard.</List.Item>
                      <List.Item>Set your display text, select an icon prefix (e.g. 🔥, ⭐), and choose a shape (Pill, Sharp, Ribbon, Outline).</List.Item>
                      <List.Item>Adjust font size slider and choose display position (Top-Left, Top-Right, etc.).</List.Item>
                      <List.Item>Select whether to apply globally or target specific products.</List.Item>
                    </List>
                  </BlockStack>
                </Box>

                {/* Step 2 */}
                <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone="attention">Step 2</Badge>
                      <Text as="h3" variant="headingMd">Enable Storefront App Embed</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd">
                      Shopify Online Store 2.0 requires activating the App Embed block in your active theme:
                    </Text>
                    <List type="number">
                      <List.Item>Navigate to <strong>Theme Setup & App Embed</strong> tab.</List.Item>
                      <List.Item>Click <strong>Open Shopify Theme Editor</strong> (opens directly in a new tab to bypass iframe blocks).</List.Item>
                      <List.Item>In the left sidebar, click <strong>App Embeds</strong> tab and toggle ON <strong>Custom Badges Embed</strong>.</List.Item>
                      <List.Item>Click <strong>Save</strong> in the top-right corner of your Theme Customizer.</List.Item>
                    </List>
                  </BlockStack>
                </Box>

                {/* Step 3 */}
                <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone="success">Step 3</Badge>
                      <Text as="h3" variant="headingMd">Track Conversions & Analytics</Text>
                    </InlineStack>
                    <Text as="p" variant="bodyMd">
                      Once published, our high-performance API tracks views and interactions automatically:
                    </Text>
                    <List type="bullet">
                      <List.Item><strong>Impressions:</strong> Every time a customer views a product card with a badge.</List.Item>
                      <List.Item><strong>Clicks:</strong> When a customer clicks on a product displaying a badge.</List.Item>
                      <List.Item><strong>CTR (Click-Through Rate):</strong> Calculated in real-time under the <strong>Analytics & CTR</strong> tab.</List.Item>
                    </List>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}