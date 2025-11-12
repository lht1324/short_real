'use client'

import {memo} from "react";

interface DefaultModalProps {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText: string;
    onClickConfirm?: () => void;
    onClickCancel: () => void;
}

function DefaultModal({
    title,
    message,
    confirmText,
    cancelText = "Cancel",
    onClickConfirm,
    onClickCancel,
}: DefaultModalProps) {
    return (
        <div
            onClick={onClickCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl max-w-md w-full mx-4 overflow-hidden shadow-2xl"
            >
                <div className="p-6">
                    {/* 제목 */}
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">
                        {title}
                    </h3>

                    {/* 메시지 */}
                    {message && <p className="text-gray-300 text-sm mb-6 leading-relaxed whitespace-pre-line">
                        {message}
                    </p>}

                    {/* 버튼 영역 */}
                    <div className="flex items-center justify-end space-x-3">
                        {confirmText && onClickConfirm && (
                            <button
                                onClick={onClickConfirm}
                                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/25"
                            >
                                {confirmText}
                            </button>
                        )}
                        <button
                            onClick={onClickCancel}
                            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-600/50 hover:border-gray-500/50 text-gray-300 rounded-lg text-sm font-medium transition-all"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(DefaultModal);