import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { PolarClient } from "@/lib/PolarClient";

/**
 * GET /api/polar/orders
 * 이메일을 기준으로 고객의 결제 내역을 조회합니다.
 * customers:read, orders:read 권한 필요
 */
export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const polar = new PolarClient().getClient();

        // Query parameter에서 email, userId 추출
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");
        const userId = searchParams.get("userId");

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: "Forbidden. You can only read your own data."
            });
        }

        // email 필수 검증
        if (!email) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "email is required and must be a string."
            });
        }

        // 1단계: 이메일로 고객 조회
        const customerResult = await polar.customers.list({
            email: email,
            limit: 1,
        });

        // 고객이 없는 경우
        if (!customerResult.result || customerResult.result.items.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: {
                    orderList: [],
                },
                message: "No customer found with the provided email."
            });
        }

        // 첫 번째 고객의 ID 추출
        const customerId = customerResult.result.items[0].id;

        // 2단계: customerId로 주문 내역 조회
        const ordersResult = await polar.orders.list({
            customerId: customerId,
        });

        const orderList = ordersResult.result.items.map((order) => {
            return {
                productName: order.product?.name ?? "-",
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                createdAt: order.createdAt,
            }
        })

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                orderList: orderList,
            },
            message: "Successfully fetched orders from Polar."
        });

    } catch (error) {
        console.error("Error in GET /api/polar/orders:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch orders from Polar."
        });
    }
}
