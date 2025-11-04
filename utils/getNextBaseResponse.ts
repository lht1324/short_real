import {NextResponse} from "next/server";
import {BaseResponse} from "@/api/types/api/BaseResponse";

interface CustomResponse extends BaseResponse {
    data?: unknown;
}

export function getNextBaseResponse(
    baseResponse: CustomResponse,
): NextResponse<BaseResponse> {
    return NextResponse.json({
        ...baseResponse,
    }, { status: baseResponse.status });
}