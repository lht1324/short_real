import {User} from "@/lib/api/types/supabase/Users";
import {eq, sql} from "drizzle-orm";
import {getNeonDb} from "@/lib/db/neon";
import {users} from "@/lib/db/schema";

export const usersServerAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        const db = getNeonDb();

        try {
            const rows = await db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            // Supabase maybeSingle()과 동일 — 0 rows면 null
            return rows[0] ? rows[0] as unknown as User : null;
        } catch (error) {
            console.error('Unexpected error in getUserByUserId:', error);
            return null;
        }
    },

    // Auth 이관용 — Better Auth ID는 UUID가 아니라서 세션→email→우리 행으로 매핑.
    // email 중복 행은 이론상 가능하나 find-or-create(콜백) 단일 경로라 1행 보장. 없으면 null.
    async getUserByEmail(email: string): Promise<User | null> {
        const db = getNeonDb();

        try {
            const rows = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            return rows[0] ? rows[0] as unknown as User : null;
        } catch (error) {
            console.error('Unexpected error in getUserByEmail:', error);
            return null;
        }
    },

    async postUsers(user: Partial<User>): Promise<User | null> {
        const db = getNeonDb();

        try {
            // 페이로드는 가입 플로우(email/name/avatar)를 채워 보내며, 누락 필드는 DB NOT NULL이 걸러준다.
            const insertPayload = user as typeof users.$inferInsert;
            const [data] = await db
                .insert(users)
                .values(insertPayload)
                .returning();

            return data as unknown as User;
        } catch (error) {
            console.error('Unexpected error in postUsers:', error);
            return null;
        }
    },

    async patchUserByUserId(userId: string, user: Partial<User>): Promise<User | null> {
        const db = getNeonDb();

        try {
            const rows = await db
                .update(users)
                .set(user)
                .where(eq(users.id, userId))
                .returning();

            // Supabase .select().single()과 동일 — 0 rows면 error를 던지므로 동일하게 throw
            if (!rows[0]) {
                throw new Error(`User not found for update: ${userId}`);
            }

            return rows[0] as unknown as User;
        } catch (error) {
            console.error('Unexpected error in patchUserByUserId:', error);
            return null;
        }
    },

    async patchUserCreditCountByUserId(userId: string, patchCreditAmount: number): Promise<User | null> {
        const db = getNeonDb();

        try {
            // Neon RPC increment_user_credit(user_id, credit_delta) — DB 함수가 atomically 증가.
            // 반환 컬럼 = users 테이블 행 전체 (RETURNS TABLE ... RETURNING users.*)
            const result = await db.execute(sql`SELECT * FROM increment_user_credit(${userId}::uuid, ${patchCreditAmount}::integer)`);

            // Supabase .rpc().single()과 동일 — 결과 1행
            const data = result.rows[0];
            if (!data) {
                throw new Error(`increment_user_credit returned no row for user: ${userId}`);
            }

            return data as unknown as User;
        } catch (error) {
            console.error('Unexpected error in patchUserCreditCountByUserId:', error);
            return null;
        }
    }
}
