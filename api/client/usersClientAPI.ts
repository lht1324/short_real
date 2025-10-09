import {User} from "@/api/types/supabase/Users";
import {getFetch} from "@/api/client/baseFetch";

export const usersClientAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        try {
            const response = await getFetch(`/api/user/${userId}`);
            const user: User | null = await response.json();

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            console.error('Error fetching user by userId:', error);
            return null;
        }
    },
}