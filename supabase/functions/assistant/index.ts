// Supabase Edge Function: Claude-powered assistant with tool use.
// Secrets: ANTHROPIC_API_KEY (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected).
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5";

const tools = [
  {
    name: "create_task",
    description:
      "Create a task with an Eisenhower quadrant (1 urgent+important, 2 important not urgent, 3 urgent less important, 4 low priority) and a one-line reason for the prioritization.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD, omit if unknown" },
        quadrant: { type: "integer", minimum: 1, maximum: 4 },
        reason: { type: "string" },
      },
      required: ["title", "quadrant", "reason"],
    },
  },
  {
    name: "complete_task",
    description: "Mark an existing task done by (partial) title match.",
    input_schema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
  {
    name: "update_milestone",
    description:
      "Record or update progress in a life area (scouts, business, fitness, school, coding, finances…). Use value for numbers like revenue.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string" },
        name: { type: "string" },
        value: { type: "number" },
        note: { type: "string" },
      },
      required: ["category", "name"],
    },
  },
];

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const jwt = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
  }
  const userId = userData.user.id;
  const { message } = await req.json();

  await supabase.from("messages").insert({ user_id: userId, role: "user", content: message });

  const messages: any[] = [{ role: "user", content: message }];
  let reply = "";

  for (let turn = 0; turn < 5; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system:
          `You are Sakai, a personal chief of staff. Today is ${new Date().toISOString().slice(0, 10)}. ` +
          "When the user shares an update, use tools to update their dashboard (tasks, milestones), then confirm briefly. " +
          "Always explain task prioritization in the reason field.",
        tools,
        messages,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      reply = `AI error: ${data.error?.message ?? res.status}`;
      break;
    }

    messages.push({ role: "assistant", content: data.content });
    const toolUses = data.content.filter((c: any) => c.type === "tool_use");
    reply = data.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n") || reply;

    if (data.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results = [];
    for (const tu of toolUses) {
      let result = "ok";
      if (tu.name === "create_task") {
        const { error } = await supabase.from("tasks").insert({ user_id: userId, ...tu.input });
        if (error) result = error.message;
      } else if (tu.name === "complete_task") {
        const { error } = await supabase
          .from("tasks")
          .update({ done: true })
          .eq("user_id", userId)
          .ilike("title", `%${tu.input.title}%`);
        if (error) result = error.message;
      } else if (tu.name === "update_milestone") {
        const { error } = await supabase
          .from("milestones")
          .insert({ user_id: userId, ...tu.input });
        if (error) result = error.message;
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: result });
    }
    messages.push({ role: "user", content: results });
  }

  await supabase.from("messages").insert({ user_id: userId, role: "assistant", content: reply });
  return new Response(JSON.stringify({ reply }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
