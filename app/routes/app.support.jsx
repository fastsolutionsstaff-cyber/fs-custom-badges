import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Divider,
  Box,
  InlineStack,
  Button,
  Badge,
  Link,
} from "@shopify/polaris";

export default function Support() {
  const supportEmail = "info@fastsolutionsdeveloper.com";
  const supportPhone = "+92 322 5981014";
  
  // Direct Web Gmail Compose URL to prevent Shopify iframe "Content Blocked" security error
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=Support%20Request%20-%20Custom%20Badges%20Pro`;

  return (
    <Page
      title="Help & Support"
      subtitle="Get in touch with our developer support team or review common solutions below."
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Direct Contact Card */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Fast Solutions Developer Support
                  </Text>
                  <Badge tone="info">Mon – Sat: 9:00 AM – 6:00 PM</Badge>
                </InlineStack>

                <Text as="p" variant="bodyMd">
                  Need custom design integration, theme embed assistance, or custom badge configurations? Reach out to our technical team directly.
                </Text>

                <Divider />

                <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        Email:
                      </Text>
                      <Link url={gmailComposeUrl} external target="_blank">
                        {supportEmail}
                      </Link>
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        Phone / WhatsApp:
                      </Text>
                      <Link url={`tel:${supportPhone.replace(/\s+/g, "")}`}>
                        {supportPhone}
                      </Link>
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        Business Hours:
                      </Text>
                      <Text as="span" variant="bodyMd">
                        Monday – Saturday, 9:00 AM – 6:00 PM
                      </Text>
                    </InlineStack>

                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        Location:
                      </Text>
                      <Text as="span" variant="bodyMd">
                        Gujrat, PK
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </Box>

                <InlineStack gap="300">
                  <Button
                    variant="primary"
                    url={gmailComposeUrl}
                    external
                    target="_blank"
                  >
                    Send Email via Gmail
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Frequently Asked Questions Card */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Frequently Asked Questions
                </Text>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Q: Why are badges not showing on my storefront?
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Ensure that the <strong>Custom Badges Embed</strong> toggle is enabled in your Shopify Theme Editor under <em>App Embeds</em>. Additionally, check that your badge is set to "Active".
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Q: Does this app slow down my storefront loading speed?
                  </Text>
                  <Text as="p" variant="bodyMd">
                    No. Badges are loaded asynchronously via lightweight assets under 4KB, ensuring zero impact on your store's Google PageSpeed performance.
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Q: How does global vs product-specific targeting work?
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Global badges appear across all collection grids and product pages. Targeted badges only display on specific Shopify Product IDs selected via the Resource Picker.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}