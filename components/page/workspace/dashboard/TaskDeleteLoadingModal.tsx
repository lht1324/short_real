'use client'

import {memo} from "react";

interface TaskDeleteLoadingModalProps {
    message?: string;
}

function TaskDeleteLoadingModal({ message = "Cancelling task..." }: TaskDeleteLoadingModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-300 text-xl font-medium">{message}</p>
                <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
            </div>
        </div>
    )
}

export default memo(TaskDeleteLoadingModal);