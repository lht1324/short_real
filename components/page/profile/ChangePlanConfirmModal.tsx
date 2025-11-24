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
            <div className="relative w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
                {/* 배경 효과 */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                </div>

                {/* 컨텐츠 */}
                <div className="relative p-8">
                    {/* 아이콘 */}
                    <div className="flex justify-center mb-6">
                        <div className="p-4 rounded-full bg-purple-500/20 border border-purple-500/30">
                            {isUpgrade ? (
                                <ArrowUp className="w-8 h-8 text-purple-400" />
                            ) : (
                                <Clock className="w-8 h-8 text-purple-400" />
                            )}
                        </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-2xl font-bold text-center text-white mb-2">
                        Change to <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">{planName}</span>?
                    </h3>

                    {/* 가격 정보 */}
                    <p className="text-center text-gray-400 mb-6">
                        ${(price / 100).toFixed(0)} / month
                    </p>

                    {/* 안내 메시지 */}
                    <div className="mb-8 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                {isUpgrade ? (
                                    <>
                                        <p className="text-sm text-gray-300 font-medium mb-1">
                                            Immediate Charge
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            ${(price / 100).toFixed(0)} will be charged immediately.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-300 font-medium mb-1">
                                            Next Billing Cycle
                                        </p>
                                        <p className="text-sm text-gray-400">
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
                            className="flex-1 px-6 py-3 rounded-full font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onClickConfirm}
                            className="flex-1 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/50"
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