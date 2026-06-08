import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireApiUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;
  return user;
}
