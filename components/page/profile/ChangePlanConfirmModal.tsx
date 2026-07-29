'use client'

import {memo, MouseEvent, useCallback} from "react";
import {AlertCircle, ArrowUp, Clock} from "lucide-react";

interface ChangePlanConfirmModalProps {
    planName: string;
    price: number;
    isUpgrade: boolean;
    onClickConfirm: () => void;
    onClickCancel: () => void;
}

function ChangePlanConfirmModal({
    planName,
    price,
    isUpgrade,
    onClickConfirm,
    onClickCancel,
}: ChangePlanConfirmModalProps) {
    // 오버레이 클릭 핸들러
    const onClickOverlay = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClickCancel();
        }
    }, [onClickCancel]);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClickOverlay}
        >
            {/* 모달 컨테이너 */}
            <div className="relative w-full max-w-md bg-zinc-950 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {/* 컨텐츠 */}
                <div className="relative p-8">
                    {/* 아이콘 */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-full bg-zinc-900 border border-white/5">
                            {isUpgrade ? (
                                <ArrowUp className="w-8 h-8 text-zinc-100" />
                            ) : (
                                <Clock className="w-8 h-8 text-zinc-500" />
                            )}
                        </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-2xl font-bold text-center text-zinc-100 mb-2">
                        Change to {planName}?
                    </h3>

                    {/* 가격 정보 */}
                    <p className="text-center text-zinc-500 mb-6">
                        ${(price / 100).toFixed(0)} / month
                    </p>

                    {/* 안내 메시지 */}
                    <div className="mb-8 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                {isUpgrade ? (
                                    <>
                                        <p className="text-sm text-zinc-200 font-semibold mb-1">
                                            Immediate Charge
                                        </p>
                                        <p className="text-xs text-zinc-500 leading-relaxed">
                                            ${(price / 100).toFixed(0)} will be charged immediately.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-zinc-200 font-semibold mb-1">
                                            Next Billing Cycle
                                        </p>
                                        <p className="text-xs text-zinc-500 leading-relaxed">
                                            Changes will take effect at the next billing cycle.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClickCancel}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onClickConfirm}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-zinc-200 transition-all duration-300"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(ChangePlanConfirmModal);