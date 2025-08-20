import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type Mode = "readOnly" | "mutate";

export async function createSupabaseServer(mode: Mode = "readOnly") {
    const store = await cookies();

    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() {
                    return store.getAll().map(({ name, value, ...opts }) => ({
                        name,
                        value,
                        options: opts as CookieOptions,
                    }))
                },
                setAll(all) {
                    if (mode === "mutate") {
                        all.forEach(({ name, value, options }) =>
                            store.set({ name, value, ...options }),
                        );
                    }
                },
            },
        },
    )
}