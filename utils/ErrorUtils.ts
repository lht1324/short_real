export function getErrorMessage(error: unknown): string | null {
    if (!error) {
        return null;
    }
    // 1. 에러가 문자열인 경우
    if (typeof error === 'string') {
        return error;
    }
    // 2. 에러가 message 속성을 가진 객체인 경우 (가장 일반적)
    if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as { message: string }).message;
    }
    // 3. 그 외의 경우, 객체를 문자열로 변환 시도
    try {
        return JSON.stringify(error);
    } catch {
        return 'Unable to stringify error object';
    }
}