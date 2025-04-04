<script lang="ts">
  // Import necessary components and icons
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { Shield } from "lucide-svelte";
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <!-- Header section with icon -->
  <div class="flex items-center gap-4 mb-8">
    <Shield class="w-8 h-8 text-primary" />
    <h1 class="text-4xl font-bold">Privacy Policy</h1>
  </div>

  <!-- Last updated date -->
  <p class="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

  <Card class="p-6">
    <div class="space-y-6">
      <!-- Introduction -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Introduction</h2>
        <p>Welcome to Nexthaven.ai. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our AI-driven rental discovery platform.</p>
      </section>

      <!-- Information We Collect -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Information We Collect</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>Personal identification information (Name, email address, phone number)</li>
          <li>Booking and rental history</li>
          <li>Payment information</li>
          <li>Usage data, preferences, and free-flow text tags (e.g., "rustic decor", "sunlit writing nook")</li>
          <li>Device and browser information</li>
          <li>Information derived from property image analysis (non-personal, feature-based)</li>
        </ul>
      </section>

      <!-- How We Use Your Information -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">How We Use Your Information</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>To process your bookings and transactions</li>
          <li>To provide customer support</li>
          <li>To send you important updates and notifications</li>
          <li>To personalize your experience by matching property features (derived from image analysis) with your stated preferences and text tags</li>
          <li>To aggregate listings from partner platforms</li>
          <li>To improve our AI models and services</li>
          <li>To comply with legal obligations</li>
        </ul>
      </section>

      <!-- Data Protection -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Data Protection</h2>
        <p>We implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Encryption of personal data</li>
          <li>Regular security assessments</li>
          <li>Access controls and authentication</li>
          <li>Regular backups and data recovery procedures</li>
          <li>Anonymization or pseudonymization of data used for AI model training where appropriate</li>
        </ul>
      </section>

      <!-- Your Rights -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Your Rights</h2>
        <p>Under data protection laws, you have rights including:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>The right to access your personal data</li>
          <li>The right to correct inaccurate personal data</li>
          <li>The right to request deletion of your personal data</li>
          <li>The right to restrict processing of your personal data</li>
          <li>The right to data portability</li>
          <li>The right to object to automated decision-making, including profiling, where applicable</li>
        </ul>
      </section>

      <!-- Contact Information -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
        <div class="mt-4">
          <Button variant="outline">
            <a href="mailto:jorge.lewis@nexthaven.ai">jorge.lewis@nexthaven.ai</a>
          </Button>
        </div>
      </section>
    </div>
  </Card>
</div>
