import {User} from "@/lib/api/types/supabase/Users";
import {getFetch, patchFetch} from "@/lib/api/client/baseFetch";

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
    
    async patchUserByUserId(userId: string, user: Partial<User>): Promise<User | null> {
        try {
            const response = await patchFetch(`/api/user/${userId}`, user);
            const patchUserByUserIdResult = await response.json();

            if (!patchUserByUserIdResult.success || !patchUserByUserIdResult.data) {
                throw new Error(patchUserByUserIdResult.error ?? 'User update failed');
            }

            return patchUserByUserIdResult.data.user;
        } catch (error) {
            console.error('Error patching user by userId:', error);
            return null;
        }
    },
}