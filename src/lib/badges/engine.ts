import { createClient } from "@/lib/supabase/server";

type BadgeCode =
  | "GIUSEPPE_SOMM" | "LABEL_WHISPERER" | "WORLD_CELLAR_TRAVELER" | "TASTING_NOTE_VIRTUOSO"
  | "STUDENT_BECOMES_MASTER" | "GIUSEPPES_FAVORITE_STUDENT" | "EPICUREAN_EXPLORER" | "THE_ARCHIVIST"
  | "BARD_OF_BOTTLES" | "THE_ALCHEMIST" | "LA_PRIMA_BOTTIGLIA" | "WINE_TIME_TRAVELER" | "POLYGLOT_PALATE";

export type EventType =
  | "QUIZ_COMPLETED" | "LABEL_SCANNED" | "COUNTRY_LOGGED" | "TASTING_NOTE" | "QUIZ_CORRECT"
  | "PAIRING" | "WINE_ADDED" | "STORY_SHARED" | "ANALYSIS"
  | "FIRST_WINE_SCANNED" | "WINE_BEFORE_1980";

export async function recordEvent(userId: string, event_type: EventType, event_value = 1, meta: any = {}) {
  const supabase = await createClient();
  await supabase.from("user_badge_events").insert({ user_id: userId, event_type, event_value, meta });
  await recomputeBadges(userId);
}

export async function recomputeBadges(userId: string) {
  const supabase = await createClient();

  // Pull unified metrics (derived + events)
  const { data: metrics } = await supabase
    .from("v_user_badge_metrics")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const m = metrics ?? {
    label_scans: 0, countries_logged: 0, wines_added: 0, tasting_notes: 0,
    correct_answers: 0, pairings_logged: 0, stories_shared: 0, analyses_run: 0, max_area_mastery: 0
  };

  // Map metrics to each badge's numeric progress
  const numericProgress: Record<BadgeCode, number> = {
    GIUSEPPE_SOMM: 0,                                // keep 0 unless you emit QUIZ_COMPLETED events elsewhere
    LABEL_WHISPERER: m.label_scans,
    WORLD_CELLAR_TRAVELER: m.countries_logged,
    TASTING_NOTE_VIRTUOSO: m.tasting_notes,
    STUDENT_BECOMES_MASTER: m.max_area_mastery,      // from user_study_mastery
    GIUSEPPES_FAVORITE_STUDENT: m.correct_answers,   // from user_quiz_progress (+events)
    EPICUREAN_EXPLORER: m.pairings_logged,           // events until native table exists
    THE_ARCHIVIST: m.wines_added,                    // cellar entries
    BARD_OF_BOTTLES: m.stories_shared,               // questions_answers as proxy
    THE_ALCHEMIST: m.analyses_run,                   // label_jobs + ai_search
    LA_PRIMA_BOTTIGLIA: 0,
    WINE_TIME_TRAVELER: 0,
    POLYGLOT_PALATE: 0,
  };

  // Fetch tiers and compute current tier by thresholds
  const { data: tiers } = await supabase.from("badge_tiers").select("*");
  const tiersBy = (tiers || []).reduce((acc: any, t: any) => {
    (acc[t.badge_code] ||= []).push(t);
    return acc;
  }, {});
  Object.values(tiersBy).forEach((arr: any[]) => arr.sort((a,b)=>a.threshold-b.threshold));

  for (const [code, value] of Object.entries(numericProgress)) {
    if (["LA_PRIMA_BOTTIGLIA","WINE_TIME_TRAVELER","POLYGLOT_PALATE"].includes(code)) continue;
    const ts = tiersBy[code] || [];
    let tier = 0;
    for (const t of ts) if (value >= t.threshold) tier = Math.max(tier, t.tier);
    await supabase.rpc("upsert_user_badge", { p_user_id: userId, p_badge_code: code, p_value: value, p_tier: tier });
  }

  // Milestones from derived view
  const { data: ms } = await supabase
    .from("v_user_badge_milestones")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (ms?.has_first_scan) await awardInstant(userId, "LA_PRIMA_BOTTIGLIA");
  if (ms?.has_pre_1980) await awardInstant(userId, "WINE_TIME_TRAVELER");
  if (ms?.has_polyglot) await awardInstant(userId, "POLYGLOT_PALATE");
}

async function awardInstant(userId: string, badge_code: BadgeCode) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("user_badges")
    .select("id, first_awarded_at")
    .eq("user_id", userId)
    .eq("badge_code", badge_code)
    .maybeSingle();

  if (!existing) {
    await supabase.from("user_badges").insert({
      user_id: userId, badge_code, current_value: 1, current_tier: 1, best_tier: 1, first_awarded_at: new Date().toISOString()
    });
  } else if (!existing.first_awarded_at) {
    await supabase.from("user_badges")
      .update({ first_awarded_at: new Date().toISOString(), current_tier: 1, best_tier: 1 })
      .eq("id", existing.id);
  }
}
