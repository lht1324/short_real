import {User} from "@/lib/api/types/supabase/Users";
import {getFetch} from "@/lib/api/client/baseFetch";

export const usersClientAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        try {
            const response = await getFetch(`/api/user/${userId}`);
            const getUserByUserIdResult = await response.json();

            if (!getUserByUserIdResult.success || !getUserByUserIdResult.data) {
                throw new Error(getUserByUserIdResult.error ?? 'User not found');
            }

            return getUserByUserIdResult.data.user;
        } catch (error) {
            console.error('Error fetching user by userId:', error);
            return null;
        }
    },
}