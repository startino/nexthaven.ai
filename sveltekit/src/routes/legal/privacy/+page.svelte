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
        <p>
          Welcome to Nexthaven.ai. Your privacy is important to us, and we are committed to protecting your personal data. This Privacy Policy explains the types of information we collect, how we use it, and the measures we take to safeguard your data when you use our AI-powered rental discovery platform.
        </p>
      </section>

      <!-- Information We Collect -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Information We Collect</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>Personal details (e.g., name, email address, phone number)</li>
          <li>Booking and rental history</li>
          <li>Payment information</li>
          <li>Usage data and preference tags (e.g., “rustic decor,” “sunlit writing nook”)</li>
          <li>Device and browser information</li>
          <li>Feature-based insights derived from property images (non-personal)</li>
        </ul>
      </section>

      <!-- How We Use Your Information -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">How We Use Your Information</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>To process bookings and manage transactions</li>
          <li>To provide customer support</li>
          <li>To deliver essential updates and notifications</li>
          <li>To personalize your experience using property features (including insights from image analysis) matched to your preferences and text tags</li>
          <li>To aggregate listings from partner platforms</li>
          <li>To enhance and refine our AI models and services</li>
          <li>To comply with legal requirements</li>
        </ul>
      </section>

      <!-- Data Protection -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Data Protection</h2>
        <p>We use appropriate technical and organizational measures to protect your data, including:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Encryption of personal data</li>
          <li>Regular security assessments</li>
          <li>Access controls and authentication protocols</li>
          <li>Frequent backups and data recovery procedures</li>
          <li>Anonymization or pseudonymization of data for AI model training when feasible</li>
        </ul>
      </section>

      <!-- Your Rights -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Your Rights</h2>
        <p>You have certain rights under data protection laws, including the right to:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li>Access your personal data</li>
          <li>Request the correction of inaccurate personal data</li>
          <li>Request the deletion of your personal data</li>
          <li>Restrict the processing of your personal data</li>
          <li>Receive your data in a portable format</li>
          <li>Object to automated decision-making, such as profiling, where applicable</li>
        </ul>
      </section>

      <!-- Contact Information -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Contact Us</h2>
        <p>If you have questions about this Privacy Policy or wish to exercise any of your rights, please contact us at:</p>
        <div class="mt-4">
          <Button variant="outline">
            <a href="mailto:jorge.lewis@nexthaven.ai">jorge.lewis@nexthaven.ai</a>
          </Button>
        </div>
      </section>
    </div>
  </Card>
</div>
