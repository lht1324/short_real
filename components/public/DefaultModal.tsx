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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-950 border border-white/10 rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl"
            >
                <div className="p-8">
                    {/* 제목 */}
                    <h3 className="text-xl font-bold text-zinc-100 mb-3">
                        {title}
                    </h3>

                    {/* 메시지 */}
                    {message && <p className="text-zinc-400 text-sm mb-8 leading-relaxed whitespace-pre-line">
                        {message}
                    </p>}

                    {/* 버튼 영역 */}
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            onClick={onClickCancel}
                            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-sm rounded-xl transition-all"
                        >
                            {cancelText}
                        </button>
                        {confirmText && onClickConfirm && (
                            <button
                                onClick={onClickConfirm}
                                className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-sm rounded-xl transition-all shadow-xl shadow-white/5"
                            >
                                {confirmText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(DefaultModal);