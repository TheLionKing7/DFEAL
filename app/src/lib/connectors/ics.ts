import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { getSiteUrl } from "@/lib/env";

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line: string) {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 72) out.push((i ? " " : "") + line.slice(i, i + 72));
  return out.join("\r\n");
}

function ymd(iso: string) {
  return iso.slice(0, 10).replace(/-/g, "");
}

/** iCalendar feed of every pursuit and tracked opportunity deadline in a firm. */
export async function buildFirmCalendar(firmId: string, firmName: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const [{ data: pursuits }, { data: lists }] = await Promise.all([
    supabase.from("watchlists").select("opportunity_id, pursuit_stage").eq("firm_id", firmId),
    supabase.from("user_opportunity_lists").select("opportunity_id, list_type").eq("firm_id", firmId),
  ]);
  const stage = new Map<string, string>();
  for (const l of lists ?? []) stage.set(l.opportunity_id, l.list_type === "track" ? "Tracking" : "Favourite");
  for (const p of pursuits ?? []) stage.set(p.opportunity_id, `Pursuit · ${p.pursuit_stage}`);
  const ids = [...stage.keys()];

  const events: string[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from("opportunities")
      .select("id, title, agency_name, response_deadline, sam_url, source_url, updated_at")
      .in("id", ids.slice(i, i + 200))
      .not("response_deadline", "is", null);
    for (const o of data ?? []) {
      const day = ymd(o.response_deadline!);
      const end = new Date(`${o.response_deadline!.slice(0, 10)}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      const link = `${getSiteUrl()}/opportunities/${encodeURIComponent(o.id)}`;
      events.push(
        [
          "BEGIN:VEVENT",
          `UID:${o.id}@smart-capture`,
          `DTSTAMP:${new Date(o.updated_at).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
          `DTSTART;VALUE=DATE:${day}`,
          `DTEND;VALUE=DATE:${ymd(end.toISOString())}`,
          fold(`SUMMARY:${esc(`Due: ${o.title}`)}`),
          fold(`DESCRIPTION:${esc(`${o.agency_name ?? ""}\n${stage.get(o.id)}\nResponse due ${new Date(o.response_deadline!).toUTCString()}\n${link}`)}`),
          fold(`URL:${link}`),
          "END:VEVENT",
        ].join("\r\n"),
      );
    }
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart Capture//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(`${firmName} — capture deadlines`)}`),
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
