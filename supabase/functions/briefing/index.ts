// Supabase Edge Function: daily briefing generator.
// Schedule with pg_cron + pg_net (see README) or call manually.
// Secrets: ANTHROPIC_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ponytail: single-user MVP — briefs every user with open tasks
  const { data: tasks } = await supabase.from("tasks").select("*").eq("done", false);
  const byUser = new Map<string, any[]>();
  for (const t of tasks ?? []) {
    byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t]);
  }

  for (const [userId, userTasks] of byUser) {
    const { data: milestones } = await supabase
      .from("milestones")
      .select("category, name, value, note")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system:
          "You are Sakai, a personal chief of staff. Write a short daily briefing (3-6 sentences, no headlines) " +
          "and identify the single highest-ROI action. Respond as JSON: {\"content\": \"...\", \"top_action\": \"...\"}",
        messages: [
          {
            role: "user",
            content: `Today: ${new Date().toISOString().slice(0, 10)}\nOpen tasks: ${JSON.stringify(
              userTasks.map((t) => ({ title: t.title, due: t.due_date, quadrant: t.quadrant }))
            )}\nRecent milestones: ${JSON.stringify(milestones ?? [])}`,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) continue;
    const text = data.content.find((c: any) => c.type === "text")?.text ?? "{}";
    try {
      const parsed = JSON.parse(text.replace(/^```json\n?|```$/g, ""));
      await supabase.from("briefings").insert({
        user_id: userId,
        content: parsed.content,
        top_action: parsed.top_action,
      });
    } catch {
      // skip malformed output; next run will retry
    }
  }

  return new Response("ok");
});
