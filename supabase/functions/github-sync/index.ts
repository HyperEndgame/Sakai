// Syncs recent GitHub activity into milestones. Schedule daily alongside briefing.
// Secrets: GITHUB_USERNAME (public events API — no token needed for public activity).
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const username = Deno.env.get("GITHUB_USERNAME");
  const userId = Deno.env.get("SAKAI_USER_ID"); // ponytail: single-user MVP
  if (!username || !userId) return new Response("missing config", { status: 400 });

  const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`);
  if (!res.ok) return new Response("github error", { status: 502 });
  const events = await res.json();

  const today = new Date().toISOString().slice(0, 10);
  const todaysPushes = events.filter(
    (e: any) => e.type === "PushEvent" && e.created_at.startsWith(today)
  );
  const commits = todaysPushes.reduce((n: number, e: any) => n + e.payload.commits.length, 0);
  const repos = [...new Set(todaysPushes.map((e: any) => e.repo.name))];

  if (commits > 0) {
    await supabase.from("milestones").insert({
      user_id: userId,
      category: "coding",
      name: `GitHub activity ${today}`,
      value: commits,
      note: `${commits} commits across ${repos.join(", ")}`,
    });
  }
  return new Response(JSON.stringify({ commits, repos }), {
    headers: { "content-type": "application/json" },
  });
});
