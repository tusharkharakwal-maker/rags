import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serverKey = Deno.env.get("PIGEON_CHAT_SECRET_KEY");

if (!supabaseUrl || !serverKey) {
  throw new Error("Set SUPABASE_URL and PIGEON_CHAT_SECRET_KEY for the pigeon-chat function.");
}

const supabase = createClient(supabaseUrl, serverKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function findRoom(roomId: string) {
  const { data, error } = await supabase
    .from("pigeon_chat_rooms")
    .select("id, token_hash")
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Use POST for chat requests." }, 405);

  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const payload = await request.json();
    const roomId = typeof payload.roomId === "string" ? payload.roomId : "";
    const action = typeof payload.action === "string" ? payload.action : "";

    if (!uuidPattern.test(roomId) || token.length < 40 || token.length > 100) {
      return json({ error: "This invitation link is invalid." }, 401);
    }
    if (!["init", "history", "send"].includes(action)) {
      return json({ error: "Unknown chat action." }, 400);
    }

    const tokenHash = await hashToken(token);
    let room = await findRoom(roomId);

    if (!room && action === "init") {
      const { error } = await supabase.from("pigeon_chat_rooms").insert({ id: roomId, token_hash: tokenHash });
      if (error && error.code !== "23505") throw error;
      room = await findRoom(roomId);
    }

    if (!room || !secureEqual(room.token_hash, tokenHash)) {
      return json({ error: "This chat room could not be found for that invitation link." }, 403);
    }

    if (action === "init") return json({ ok: true });

    if (action === "history") {
      const { data, error } = await supabase
        .from("pigeon_chat_messages")
        .select("id, sender_id, sender_name, body, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ messages: (data || []).reverse() });
    }

    const senderId = typeof payload.senderId === "string" ? payload.senderId : "";
    const senderName = typeof payload.senderName === "string" ? payload.senderName.trim().slice(0, 24) : "";
    const body = typeof payload.body === "string" ? payload.body.trim().slice(0, 500) : "";
    if (!uuidPattern.test(senderId) || !senderName || !body) {
      return json({ error: "Add your name and a message before sending." }, 400);
    }

    const recentSince = new Date(Date.now() - 10_000).toISOString();
    const { count, error: rateError } = await supabase
      .from("pigeon_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("sender_id", senderId)
      .gte("created_at", recentSince);
    if (rateError) throw rateError;
    if ((count || 0) >= 8) return json({ error: "Please wait a moment before sending another message." }, 429);

    const { data, error } = await supabase
      .from("pigeon_chat_messages")
      .insert({ room_id: roomId, sender_id: senderId, sender_name: senderName, body })
      .select("id, sender_id, sender_name, body, created_at")
      .single();
    if (error) throw error;
    return json({ message: data }, 201);
  } catch (error) {
    console.error("pigeon-chat error", error);
    return json({ error: "The chat could not complete that request. Try again shortly." }, 500);
  }
});
