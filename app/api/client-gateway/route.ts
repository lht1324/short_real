import { NextRequest, NextResponse } from "next/server";
import { getIsValidRequestC2S } from "@/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";

/**
 * Client Gateway Handler
 * Centralized, transparent entry point for Client-to-Server (C2S) requests.
 * Authenticates the session, injects 'userId', and forwards everything else 'as-is'.
 */
async function handleGatewayRequest(request: NextRequest) {
    // 1. Authenticate Session and get userId
    const { isValidRequest, user } = await getIsValidRequestC2S();
    
    if (!isValidRequest || !user) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Sign-in required."
        });
    }
    // 로그인 안 하는 경우도 대비해야 함
    // Whitelist?

    const userId = user.id;
    const method = request.method;
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path');

    if (!targetPath) {
        return getNextBaseResponse({ success: false, status: 400, error: "Missing 'path' param." });
    }

    // 3. Construct Internal URL & Params (Inject userId into Query)
    const internalParams = new URLSearchParams(searchParams);
    internalParams.delete('path');
    internalParams.set('userId', userId); // Always provide userId for internal consumption
    
    const queryString = internalParams.toString();
    const internalApiUrl = `${process.env.BASE_URL}/api${targetPath}${queryString ? `?${queryString}` : ""}`;

    try {
        const fetchOptions: RequestInit = {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "x-internal-secret": process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET!,
            },
            body: method !== 'GET' ? JSON.stringify(await request.json().catch(() => ({}))) : undefined,
        };

        // 5. Proxy the request and return the response directly
        const response = await fetch(internalApiUrl, fetchOptions);
        const data = await response.json().catch(() => ({}));
        
        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error(`[Gateway Error] ${method} ${targetPath}:`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Gateway failed to proxy the request."
        });
    }
}

export const GET = handleGatewayRequest;
export const POST = handleGatewayRequest;
export const PATCH = handleGatewayRequest;
export const PUT = handleGatewayRequest;
export const DELETE = handleGatewayRequest;
