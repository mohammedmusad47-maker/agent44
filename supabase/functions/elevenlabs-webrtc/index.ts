import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY is not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { offerSdp } = await req.json();
    if (!offerSdp || typeof offerSdp !== "string") {
      return new Response(JSON.stringify({ error: "Missing offerSdp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Create agent session to get signed URL
    const sessionResp = await fetch(
      "https://api.elevenlabs.io/v1/convai/agent_sessions",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agent_id: "agent_0901kac52mhdey8th2aerttkdy2g"
        })
      }
    );

    if (!sessionResp.ok) {
      const t = await sessionResp.text();
      let msg = `Failed to create agent session (${sessionResp.status})`;
      try { const j = JSON.parse(t); msg = j?.detail?.message || msg; } catch {}
      return new Response(JSON.stringify({ error: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { url: signed_url } = await sessionResp.json();
    console.log('Received signed URL:', signed_url);

    // 2) Exchange SDP via server (avoid browser CORS)
    // CRITICAL: If ElevenLabs returns a WebSocket URL (wss://...), convert to https:// for SDP POST
    let sdpEndpoint = signed_url;
    
    if (typeof signed_url === 'string') {
      if (signed_url.startsWith('wss://')) {
        sdpEndpoint = signed_url.replace('wss://', 'https://');
        console.log('Converted wss:// to https://:', sdpEndpoint);
      } else if (signed_url.startsWith('ws://')) {
        sdpEndpoint = signed_url.replace('ws://', 'http://');
        console.log('Converted ws:// to http://:', sdpEndpoint);
      }
    }

    console.log('Posting SDP to:', sdpEndpoint);

    const answerResp = await fetch(sdpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offerSdp,
    });

    if (!answerResp.ok) {
      const t = await answerResp.text();
      return new Response(JSON.stringify({ error: `SDP exchange failed (${answerResp.status})`, details: t }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answerSdp = await answerResp.text();

    return new Response(JSON.stringify({ ok: true, sdp: answerSdp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
