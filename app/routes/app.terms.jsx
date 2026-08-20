import { Page, Layout, Card, BlockStack, Text, Divider, Box, List } from "@shopify/polaris";

export default function TermsOfService() {
  return (
    <Page title="Terms of Service" subtitle="Effective Date: August 2026">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">1. Agreement to Terms</Text>
              <Text as="p" variant="bodyMd">
                By installing and using <strong>Custom Badges Pro</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please uninstall the app immediately.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">2. App License & Usage</Text>
              <Text as="p" variant="bodyMd">
                We grant you a non-exclusive, non-transferable, revocable license to use the app on Shopify stores where you are an authorized owner or administrator. You agree not to reverse engineer, decompile, or attempt to extract the source code of the application.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">3. Billing & Subscriptions</Text>
              <List type="bullet">
                <List.Item>All subscription charges are processed directly through Shopify's Official Billing API.</List.Item>
                <List.Item>Fees are billed on a recurring monthly or annual basis as specified during plan selection.</List.Item>
                <List.Item>Refund requests follow Shopify's standard App Store billing policies.</List.Item>
              </List>

              <Divider />

              <Text as="h2" variant="headingMd">4. Service Availability & SLA</Text>
              <Text as="p" variant="bodyMd">
                We strive to maintain 99.9% uptime for storefront CDN badge rendering assets. However, we are not liable for temporary service interruptions caused by third-party outages or theme structure incompatibilities beyond our control.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">5. Limitation of Liability</Text>
              <Text as="p" variant="bodyMd">
                In no event shall Custom Badges Pro or its developers be liable for indirect, incidental, or consequential damages (including loss of profits or store revenues) arising from the use of our services.
              </Text>

              <Divider />

              <Text as="h2" variant="headingMd">6. Contact Information</Text>
              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                <Text as="p" variant="bodyMd">
                  For legal queries regarding these Terms, contact us at: <strong>legal@yourdomain.com</strong>
                </Text>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}