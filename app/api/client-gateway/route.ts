import { NextRequest, NextResponse } from "next/server";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";

/**
 * Client Gateway Handler
 * Centralized, transparent entry point for Client-to-Server (C2S) requests.
 * Authenticates the session, injects 'userId', and forwards everything else 'as-is'.
 */

// Whitelist for public routes (No authentication required)
const PUBLIC_ROUTES = [
    { method: "GET", path: "/api/polar/products" },
    { method: "GET", path: "/api/roadmap" },
    { method: "GET", path: "/api/voice" }
];

async function handleGatewayRequest(request: NextRequest) {
    const method = request.method;
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path'); // e.g., "/test"

    if (!targetPath) {
        return getNextBaseResponse({ success: false, status: 400, error: "Missing 'path' param." });
    }

    // 1. Check if the route is public
    // Matches if the whitelist path is either exactly 'targetPath' or '/api' + 'targetPath'
    const isPublic = PUBLIC_ROUTES.some(route => 
        route.method === method && (route.path === targetPath || route.path === `${targetPath}`)
    );

    // 2. Authenticate Session (Always attempt, but enforce only if not public)
    const { isValidRequest, user } = await getIsValidRequestC2S();

    console.log("getIsValidRequestC2S(): ", {
        isValidRequest,
        user,
        method,
        targetPath,
    })

    if (!(isPublic || (isValidRequest && user))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Sign-in required."
        });
    }

    // 3. Inject userId (provide empty string if anonymous but public)
    const userId = user?.id || "";
    
    // 4. Construct Internal URL & Params (Inject userId into Query)
    const internalParams = new URLSearchParams(searchParams);
    internalParams.delete('path');

    if (!isPublic) {
        internalParams.set('userId', userId); // Always provide userId for internal consumption
    }
    
    const queryString = internalParams.toString();
    const internalApiUrl = `${process.env.BASE_URL}${targetPath}${queryString ? `?${queryString}` : ""}`;

    console.log(internalApiUrl);

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
        const data = await response.json().catch((error) => {
            console.log(`[${targetPath}${queryString ? `?${queryString}` : ""}] client-gateway error`, error);

            return { };
        });

        if (data && data.success) {
            return getNextBaseResponse({
                success: data.success,
                status: data.status,
                data: data.data,
            });
        } else {
            return getNextBaseResponse({
                success: false,
                status: data?.status ?? 500,
                error: data?.error ?? "Internal Server Error",
            });
        }
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
