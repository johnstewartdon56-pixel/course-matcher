import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ybuawwogwxnhsgznqdui.supabase.co";
const supabaseAnonKey = "sb_publishable_bmXKh3_fXcLrlJwgdsHi5w__fFSsjKk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
