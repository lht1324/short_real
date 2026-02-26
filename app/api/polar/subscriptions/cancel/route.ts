import { NextRequest } from "next/server";
import { getIsValidRequestC2S } from "@/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { PolarClient } from "@/lib/PolarClient";

export async function DELETE(request: NextRequest) {
    const {
        user: sessionUser,
        isValidRequest,
    } = await getIsValidRequestC2S();

    if (!isValidRequest || !sessionUser) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "subscriptionId is required as a query parameter."
        });
    }

    try {
        const polar = new PolarClient().getClient();

        // Verify ownership
        // DB에 저장된 사용자의 subscription_id와 요청된 subscriptionId가 일치하는지 확인
        // 만약 DB에 subscription_id가 없다면, 보안상 요청을 거부하거나(추천), 
        // Polar API를 통해 해당 구독이 이 유저의 것인지 확인해야 함.
        // 여기서는 DB의 최신 정보를 가져와서 비교합니다.
        
        const user = await usersServerAPI.getUserByUserId(sessionUser.id);
        
        if (!user) {
             return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found."
            });
        }

        if (user.subscription_id !== subscriptionId) {
             return getNextBaseResponse({
                success: false,
                status: 403,
                error: "You do not have permission to cancel this subscription."
            });
        }

        // Polar API 호출하여 구독 취소 (기간 말에 종료)
        await polar.subscriptions.update({
            id: subscriptionId,
            subscriptionUpdate: {
                cancelAtPeriodEnd: true,
            },
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Subscription canceled successfully. It will remain active until the end of the current billing period."
        });
    } catch (error) {
        console.error("Error in DELETE /api/polar/subscriptions/cancel:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to cancel subscription."
        });
    }
}
