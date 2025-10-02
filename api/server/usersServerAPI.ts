import {User} from "@/api/types/supabase/Users";
import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

export const usersServerAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const { data, error }: PostgrestSingleResponse<User | null> = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user by userId:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error in getUserByUserId:', error);
            return null;
        }
    },

    async postUsers(user: Partial<User>): Promise<User | null> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const { data, error } = await supabase
                .from('users')
                .insert([user])
                .select()
                .single();

            if (error) {
                console.error('Error inserting user:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error in postUsers:', error);
            return null;
        }
    }
}