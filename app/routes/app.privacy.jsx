import { Page, Layout, Card, BlockStack, Text, Divider, Box, List } from "@shopify/polaris";

export default function PrivacyPolicy() {
  return (
    <Page title="Privacy Policy" subtitle="Last Updated: August 2026">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">1. Introduction</Text>
              <Text as="p" variant="bodyMd">
                <strong>Custom Badges Pro</strong> ("we", "our", or "us") is committed to protecting the privacy of merchants and storefront visitors. This Privacy Policy outlines how we collect, use, store, and process personal data when you install or use our Shopify application.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">2. Data We Collect</Text>
              <Text as="p" variant="bodyMd">To provide core app functionality, we collect and store the following minimal dataset:</Text>
              <List type="bullet">
                <List.Item><strong>Merchant Account Data:</strong> Myshopify domain, store email, access tokens, and store location settings.</List.Item>
                <List.Item><strong>Configuration Data:</strong> Custom badge settings, text strings, colors, display positions, and targeted Shopify Product IDs.</List.Item>
                <List.Item><strong>Storefront Analytics:</strong> Aggregated, non-personally identifiable metrics including badge impressions and click counts to compute Click-Through Rates (CTR).</List.Item>
              </List>

              <Divider />

              <Text as="h2" variant="headingMd">3. How We Use Your Data</Text>
              <Text as="p" variant="bodyMd">We strictly use the collected data for the following purposes:</Text>
              <List type="bullet">
                <List.Item>To dynamic render custom product badges on your storefront via App Proxies and Theme Embeds.</List.Item>
                <List.Item>To aggregate impression and click data for your in-app Analytics Dashboard.</List.Item>
                <List.Item>To authenticate app sessions and maintain store setup status.</List.Item>
              </List>

              <Divider />

              <Text as="h2" variant="headingMd">4. Data Sharing & Third Parties</Text>
              <Text as="p" variant="bodyMd">
                We <strong>do not sell, rent, or trade</strong> any merchant or customer personal data to third parties or advertising networks. Data is only shared with standard cloud hosting providers required to run our database and API endpoints.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">5. GDPR & Data Retention</Text>
              <Text as="p" variant="bodyMd">
                When a merchant uninstalls the application, Shopify triggers mandatory redaction webhooks. We automatically delete all associated store configurations, access tokens, and analytics records within 48 hours of app deletion.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">6. Contact Us</Text>
              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                <Text as="p" variant="bodyMd">
                  For privacy-related inquiries or data deletion requests, contact our privacy team at: <strong>privacy@yourdomain.com</strong>
                </Text>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}