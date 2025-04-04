<script lang="ts">
  // Import necessary components and icons
  import { Button } from "$lib/components/ui/button";
  import { Card } from "$lib/components/ui/card";
  import { Scale } from "lucide-svelte";
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <!-- Header section with icon -->
  <div class="flex items-center gap-4 mb-8">
    <Scale class="w-8 h-8 text-primary" />
    <h1 class="text-4xl font-bold">Terms of Service</h1>
  </div>

  <!-- Last updated date -->
  <p class="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

  <Card class="p-6">
    <div class="space-y-6">
      <!-- Introduction -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Introduction</h2>
        <p>Welcome to Nexthaven.ai. By accessing or using our service, you agree to be bound by these Terms of Service. Please read these terms carefully before using our platform.</p>
      </section>

      <!-- Definitions -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Definitions</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li><strong>Service:</strong> The Nexthaven.ai platform and all related services</li>
          <li><strong>User:</strong> Any individual or entity using our Service</li>
          <li><strong>Content:</strong> All information and materials available on our Service</li>
          <li><strong>Account:</strong> A registered user profile on our platform</li>
        </ul>
      </section>

      <!-- User Responsibilities -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">User Responsibilities</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account</li>
          <li>Comply with all applicable laws and regulations</li>
          <li>Use the service responsibly and respectfully</li>
          <li>Report any suspicious or unauthorized activity</li>
        </ul>
      </section>

      <!-- Booking and Rental Terms -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Booking and Rental Terms</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>All bookings are subject to availability and confirmation</li>
          <li>Users must comply with rental property rules and regulations</li>
          <li>Cancellation policies apply as specified for each booking</li>
          <li>Payment terms and security deposits may be required</li>
          <li>Users are responsible for any damages during their stay</li>
        </ul>
      </section>

      <!-- Intellectual Property -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Intellectual Property</h2>
        <p>All content, features, and functionality of our Service are owned by Nexthaven.ai and are protected by international copyright, trademark, and other intellectual property laws.</p>
      </section>

      <!-- Limitation of Liability -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Nexthaven.ai shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
      </section>

      <!-- Changes to Terms -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through our platform.</p>
      </section>

      <!-- Contact Information -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Contact Us</h2>
        <p>If you have any questions about these Terms of Service, please contact us at:</p>
        <div class="mt-4">
          <Button variant="outline">
            <a href="mailto:jorge.lewis@nexthaven.ai">jorge.lewis@nexthaven.ai</a>
          </Button>
        </div>
      </section>
    </div>
  </Card>
</div>
