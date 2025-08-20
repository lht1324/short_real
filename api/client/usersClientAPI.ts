import {User} from "@/api/types/supabase/Users";
import {getFetch, postFetch} from "@/api/client/baseFetch";

export const usersClientAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        try {
            const response = await getFetch(`/api/users?userId=${userId}`);
            const user: User = await response.json();

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            console.error('Error fetching user by userId:', error);
            return null;
        }
    },

    async postUsers(user: User): Promise<User | null> {
        try {
            const response = await postFetch('/api/users', user);
            const result: User = await response.json();

            if (!result) {
                throw new Error('User not found');
            }

            return result;
        } catch (error) {
            console.error('Error posting user:', error);
            return null;
        }
    }
}