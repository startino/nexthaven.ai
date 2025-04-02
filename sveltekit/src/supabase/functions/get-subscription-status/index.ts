// Following Supabase Edge Function example for Stripe
// https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/stripe-webhooks

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const stripe = Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // We'll manually get the user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseKey,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to get user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = await userResponse.json();
    const user = userData.user || userData;

    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing customer
    const customerResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?user_id=eq.${user.id}&select=stripe_customer_id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!customerResponse.ok) {
      return new Response(
        JSON.stringify({
          isActive: false,
          message: "Failed to check customer records",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customers = await customerResponse.json();
    if (
      !customers ||
      customers.length === 0 ||
      !customers[0].stripe_customer_id
    ) {
      return new Response(
        JSON.stringify({
          isActive: false,
          message: "No customer record found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customers[0].stripe_customer_id;

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      expand: ["data.plan.product"],
    });

    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ isActive: false, message: "No active subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the first active subscription (most users will only have one)
    const subscription = subscriptions.data[0];
    const plan = subscription.items.data[0].plan;
    const product = plan.product;

    return new Response(
      JSON.stringify({
        isActive: true,
        subscriptionId: subscription.id,
        planId: plan.id,
        planName: product.name,
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, isActive: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
