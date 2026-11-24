
"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/supabase/user";

export type CreatePlaylistResult =
  | { ok: true; playlistId: string }
  | { ok: false; error: string };

export async function createPlaylistAction(
  rawName: string,
): Promise<CreatePlaylistResult> {
  const name = rawName.trim();

  if (!name || name.length > 100) {
    return {
      ok: false,
      error: "Playlist name must be between 1 and 100 characters.",
    };
  }

  const verified = await getVerifiedUser();

  if (!verified.configured) {
    return { ok: false, error: "Playlist storage isn't configured." };
  }

  if (!verified.user) {
    return { ok: false, error: "Please sign in to create a playlist." };
  }

  try {
    const { data, error } = await verified.supabase
      .from("playlists")
      .insert({
        user_id: verified.user.id,
        name,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: "Couldn't create your playlist. Please try again.",
      };
    }

    revalidatePath("/");
    return { ok: true, playlistId: data.id };
  } catch {
    return {
      ok: false,
      error: "Something went wrong while creating your playlist.",
    };
  }
}
