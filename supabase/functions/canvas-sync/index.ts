// Imports Canvas assignments from the user's calendar ICS feed into tasks.
// Canvas → Calendar → "Calendar Feed" gives a public .ics URL — no OAuth needed.
// Secrets: CANVAS_ICS_URL, SAKAI_USER_ID.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const icsUrl = Deno.env.get("CANVAS_ICS_URL");
  const userId = Deno.env.get("SAKAI_USER_ID");
  if (!icsUrl || !userId) return new Response("missing config", { status: 400 });

  const res = await fetch(icsUrl);
  if (!res.ok) return new Response("canvas error", { status: 502 });
  const ics = await res.text();

  // ponytail: minimal ICS parse — SUMMARY + DTSTART per VEVENT; a parser lib when this misses fields
  const events = ics.split("BEGIN:VEVENT").slice(1).map((block) => {
    const summary = block.match(/SUMMARY:(.+)/)?.[1]?.trim();
    const dt = block.match(/DTSTART[^:]*:(\d{8})/)?.[1];
    const due = dt ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : null;
    return { summary, due };
  }).filter((e) => e.summary && e.due && e.due >= new Date().toISOString().slice(0, 10));

  let created = 0;
  for (const e of events) {
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .eq("title", e.summary!)
      .eq("source", "canvas")
      .maybeSingle();
    if (existing) continue;

    const daysOut = (new Date(e.due!).getTime() - Date.now()) / 86400000;
    await supabase.from("tasks").insert({
      user_id: userId,
      title: e.summary,
      due_date: e.due,
      quadrant: daysOut <= 3 ? 1 : 2,
      reason: daysOut <= 3 ? "School deadline within 3 days" : "School deadline — important, not yet urgent",
      source: "canvas",
    });
    created++;
  }
  return new Response(JSON.stringify({ created }), {
    headers: { "content-type": "application/json" },
  });
});
