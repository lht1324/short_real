import { deleteFetch, getFetch, patchFetch, postFetch } from "@/lib/api/client/baseFetch";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";

export const autopilotDataClientAPI = {
    async postAutopilotData(newAutopilotData: Partial<AutopilotData>): Promise<AutopilotData | null> {
        try {
            const response = await postFetch(`/api/autopilot-data`, newAutopilotData);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw Error(result.error ?? 'Unknown error while creating autopilot data.');
            }

            return result.data.autopilotData;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async getAutopilotDataByUserId(userId: string): Promise<AutopilotData[]> {
        try {
            const response = await getFetch(`/api/autopilot-data/user/${userId}`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw Error(result.error ?? 'Unknown error while fetching autopilot data by user id.');
            }

            return result.data.autopilotDataList;
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    async patchAutopilotDataByUserId(userId: string, updateData: Partial<AutopilotData>): Promise<AutopilotData[] | null> {
        try {
            const response = await patchFetch(`/api/autopilot-data/user/${userId}`, updateData);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw Error(result.error ?? 'Unknown error while patching autopilot data by user id.');
            }

            return result.data.autopilotDataList;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async deleteAutopilotDataByUserId(userId: string): Promise<boolean> {
        try {
            const response = await deleteFetch(`/api/autopilot-data/user/${userId}`);
            const result = await response.json();

            if (!result.success) {
                throw Error(result.error ?? 'Unknown error while deleting autopilot data by user id.');
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    },

    async getAutopilotDataBySeriesId(seriesId: string): Promise<AutopilotData | null> {
        try {
            const response = await getFetch(`/api/autopilot-data/series/${seriesId}`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw Error(result.error ?? 'Unknown error while fetching autopilot data by series id.');
            }

            return result.data.autopilotData;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async patchAutopilotDataBySeriesId(seriesId: string, updateData: Partial<AutopilotData>, runImmediately?: boolean): Promise<AutopilotData | null> {
        try {
            const url = `/api/autopilot-data/series/${seriesId}?runImmediately=${runImmediately ?? false}`;
            const response = await patchFetch(url, updateData);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw Error(result.error ?? 'Unknown error while patching autopilot data by series id.');
            }

            return result.data.autopilotData;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async deleteAutopilotDataBySeriesId(seriesId: string): Promise<boolean> {
        try {
            const response = await deleteFetch(`/api/autopilot-data/series/${seriesId}`);
            const result = await response.json();

            if (!result.success) {
                throw Error(result.error ?? 'Unknown error while deleting autopilot data by series id.');
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    },

    async getAutopilotDataPlatformConnection(): Promise<{
        youtube: boolean,
        tiktok: boolean,
        instagram: boolean,
    } | null> {
        try {
            const response = await getFetch(`/api/autopilot-data/platform-connection`);
            const result = await response.json();

            if (!result.success) {
                throw Error(result.error ?? 'Unknown error while fetching autopilot platform connection data by series id.');
            }

            return result.data.platformConnection;
        } catch (error) {
            console.error(error);
            return null;
        }
    },
}
