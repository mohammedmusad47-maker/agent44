import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  email: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: Payload = await req.json();
    const normalizedEmail = (email || "").toLowerCase().trim();

    console.log("Checking email:", normalizedEmail);

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      console.log("Invalid email format");
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check in public.profiles using PostgREST with service role (bypass RLS)
    let existsInProfiles = false;
    try {
      console.log("Checking profiles table...");
      const profilesRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=id&email=ilike.${encodeURIComponent(
          normalizedEmail
        )}&limit=1`,
        {
          headers: {
            apikey: SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      console.log("Profiles response status:", profilesRes.status);
      
      if (profilesRes.ok) {
        const arr = await profilesRes.json();
        console.log("Profiles response data:", arr);
        existsInProfiles = Array.isArray(arr) && arr.length > 0;
      } else {
        const text = await profilesRes.text();
        console.error("Profiles check error:", profilesRes.status, text);
      }
    } catch (e) {
      console.error("Error checking profiles:", e);
    }

    console.log("Email exists in profiles:", existsInProfiles);

    return new Response(JSON.stringify({ exists: existsInProfiles }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("check-email function error:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
