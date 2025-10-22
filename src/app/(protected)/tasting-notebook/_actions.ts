"use server";

import { createClient } from "@/lib/supabase/server";
import { TastingNoteSchema, type TastingNoteInput } from "./schemas";
import { revalidatePath } from "next/cache";

export async function createTastingNote(input: TastingNoteInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: uerr
  } = await supabase.auth.getUser();
  if (uerr || !user) throw new Error("Not authenticated");

  console.log('Creating tasting note with input:', input);
  const parsed = TastingNoteSchema.parse(input);
  console.log('Parsed tasting note data:', parsed);
  
  // Validate required fields and constraints
  console.log('Validating palate values:', {
    sweetness: parsed.sweetness,
    acidity: parsed.acidity,
    body: parsed.body,
    tannin: parsed.tannin,
    oak: parsed.oak,
    old_world_bias: parsed.old_world_bias,
    finish_len: parsed.finish_len,
    rating_bottles: parsed.rating_bottles
  });

  const { data, error } = await supabase
    .from("tasting_notes")
    .insert({
      user_id: user.id,
      tasting_date: parsed.tasting_date ?? new Date().toISOString().slice(0,10),
      wine_name: parsed.wine_name,
      producer: parsed.producer,
      grapes: parsed.grapes,
      vintage: parsed.vintage,
      alcohol_pct: parsed.alcohol_pct,
      country_id: parsed.country_id ?? null,
      region_id: parsed.region_id ?? null,
      price: parsed.price,
      my_notes: parsed.my_notes,
      drink_starting: parsed.drink_starting,
      drink_by: parsed.drink_by,
      bottle_size: parsed.bottle_size,
      is_bubbly: parsed.is_bubbly ?? false,
      appearance_color: parsed.appearance_color,
      aroma_tags: parsed.aroma_tags ?? [],
      sweetness: parsed.sweetness,
      acidity: parsed.acidity,
      body: parsed.body,
      tannin: parsed.tannin,
      oak: parsed.oak,
      old_world_bias: parsed.old_world_bias,
      finish_len: parsed.finish_len,
      rating_bottles: parsed.rating_bottles,
      location: parsed.location
    })
    .select("note_id")
    .single();

  if (error) {
    console.error('Database error creating tasting note:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    throw error;
  }

  // Badge wiring (Tasting Note Virtuoso):
  // call a stored procedure or service util to compute and award badge.
  try {
    const { awardTastingVirtuosoBadge } = await import("@/lib/badges/tastingVirtuoso");
    await awardTastingVirtuosoBadge(user.id);
  } catch (error) {
    console.error("Error awarding tasting virtuoso badge:", error);
    // Don't fail the note creation if badge awarding fails
  }

  if (parsed.add_to_cellar && parsed.add_to_cellar_qty) {
    await copyNoteToCellar(supabase, user.id, data.note_id, parsed.add_to_cellar_qty);
  }

  revalidatePath("/tasting-notebook");
  return data.note_id as number;
}

async function copyNoteToCellar(supabase: any, userId: string, noteId: number, qty: number) {
  // Fetch note
  const { data: note, error } = await supabase.from("tasting_notes").select("*").eq("note_id", noteId).single();
  if (error || !note) throw error ?? new Error("Note not found");

  // First, create or find a wine record in the wines table
  // Check if wine already exists
  const { data: existingWine } = await supabase
    .from("wines")
    .select("wine_id")
    .eq("wine_name", note.wine_name)
    .eq("producer", note.producer)
    .eq("vintage", note.vintage)
    .single();

  let wineId;
  if (existingWine) {
    wineId = existingWine.wine_id;
  } else {
    // Create new wine record
    const { data: newWine, error: wineError } = await supabase
      .from("wines")
      .insert({
        wine_name: note.wine_name,
        producer: note.producer,
        vintage: note.vintage,
        alcohol: note.alcohol_pct,
        country_id: note.country_id,
        region_id: note.region_id,
        bottle_size: note.bottle_size,
        bubbly: note.is_bubbly ? "Yes" : "No",  // Convert boolean to Yes/No/Slight format
        typical_price: note.price,
        drink_starting: note.drink_starting,
        drink_by: note.drink_by
      })
      .select("wine_id")
      .single();
    
    if (wineError) throw wineError;
    wineId = newWine.wine_id;
  }

  // Now insert into cellar_items with the wine_id
  const payload = {
    user_id: userId,
    wine_id: wineId,
    quantity: qty,
    where_stored: null,
    value: note.price,
    status: 'stored',
    currency: 'USD',
    my_notes: note.my_notes,
    my_rating: note.rating_bottles
  };

  const { error: ciErr } = await supabase.from("cellar_items").insert(payload);
  if (ciErr) {
    console.error('Error inserting into cellar_items:', ciErr);
    throw ciErr;
  }
}

export async function getTastingNotes(searchQuery?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: uerr
  } = await supabase.auth.getUser();
  if (uerr || !user) throw new Error("Not authenticated");

  let query = supabase
    .from("tasting_notes")
    .select("note_id, tasting_date, wine_name, producer, rating_bottles")
    .eq("user_id", user.id)
    .order("tasting_date", { ascending: false });

  if (searchQuery?.trim()) {
    query = query.or(`wine_name.ilike.%${searchQuery}%,producer.ilike.%${searchQuery}%,my_notes.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

export async function getTastingNote(noteId: number) {
  const supabase = await createClient();
  const {
    data: { user },
    error: uerr
  } = await supabase.auth.getUser();
  if (uerr || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("tasting_notes")
    .select("*")
    .eq("note_id", noteId)
    .eq("user_id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAromaTerms() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("aroma_terms")
    .select("aroma_id, label")
    .order("label");

  if (error) throw error;
  return data;
}

export async function deleteTastingNote(noteId: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  // Delete aroma associations first
  const { error: aromaError } = await supabase
    .from("tasting_note_aromas")
    .delete()
    .eq("note_id", noteId);

  if (aromaError) {
    console.error('Error deleting aroma associations:', aromaError);
    throw aromaError;
  }

  // Delete the tasting note
  const { error } = await supabase
    .from("tasting_notes")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", user.id); // Ensure user can only delete their own notes

  if (error) {
    console.error('Error deleting tasting note:', error);
    throw error;
  }

  revalidatePath("/tasting-notebook");
}

export async function updateTastingNote(noteId: number, input: TastingNoteInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const parsed = TastingNoteSchema.parse(input);

  // Update the tasting note
  const { data, error } = await supabase
    .from("tasting_notes")
    .update({
      wine_name: parsed.wine_name,
      producer: parsed.producer,
      grapes: parsed.grapes,
      vintage: parsed.vintage,
      alcohol_pct: parsed.alcohol_pct,
      country_id: parsed.country_id,
      region_id: parsed.region_id,
      price: parsed.price,
      my_notes: parsed.my_notes,
      drink_starting: parsed.drink_starting,
      drink_by: parsed.drink_by,
      bottle_size: parsed.bottle_size,
      is_bubbly: parsed.is_bubbly,
      appearance_color: parsed.appearance_color,
      sweetness: parsed.sweetness,
      acidity: parsed.acidity,
      body: parsed.body,
      tannin: parsed.tannin,
      oak: parsed.oak,
      old_world_bias: parsed.old_world_bias,
      finish_len: parsed.finish_len,
      rating_bottles: parsed.rating_bottles,
      location: parsed.location,
      updated_at: new Date().toISOString()
    })
    .eq("note_id", noteId)
    .eq("user_id", user.id) // Ensure user can only update their own notes
    .select("note_id")
    .single();

  if (error) {
    console.error('Error updating tasting note:', error);
    throw error;
  }

  // Update aroma associations
  // First, delete existing associations
  const { error: deleteAromaError } = await supabase
    .from("tasting_note_aromas")
    .delete()
    .eq("note_id", noteId);

  if (deleteAromaError) {
    console.error('Error deleting aroma associations:', deleteAromaError);
    throw deleteAromaError;
  }

  // Then, insert new associations
  if (parsed.aroma_tags && parsed.aroma_tags.length > 0) {
    // First, get the aroma_id for each aroma tag
    const { data: aromaTerms, error: aromaTermsError } = await supabase
      .from("aroma_terms")
      .select("aroma_id, label")
      .in("label", parsed.aroma_tags);

    if (aromaTermsError) {
      console.error('Error fetching aroma terms:', aromaTermsError);
      throw aromaTermsError;
    }

    if (aromaTerms && aromaTerms.length > 0) {
      const aromaInserts = aromaTerms.map(term => ({
        note_id: noteId,
        aroma_id: term.aroma_id
      }));

      const { error: insertAromaError } = await supabase
        .from("tasting_note_aromas")
        .insert(aromaInserts);

      if (insertAromaError) {
        console.error('Error inserting aroma associations:', insertAromaError);
        throw insertAromaError;
      }
    }
  }

  revalidatePath("/tasting-notebook");
  revalidatePath(`/tasting-notebook/${noteId}`);
  return data.note_id as number;
}
