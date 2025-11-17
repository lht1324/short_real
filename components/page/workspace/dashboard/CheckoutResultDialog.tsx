'use client'

import {memo, useCallback} from "react";
import {CheckCircle, Sparkles, X} from "lucide-react";

export interface CheckoutResultDialogData {
    planName: string;
    price: number;
    creditCount: number;
}

interface CheckoutResultDialogProps {
    checkoutResultDialogData: CheckoutResultDialogData;
    onClose: () => void;
}

function CheckoutResultDialog({
    checkoutResultDialogData,
    onClose,
}: CheckoutResultDialogProps) {
    const onClickConfirm = useCallback(() => {
        onClose();
    }, [onClose]);

    const onClickBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClickBackdrop}
        >
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            <div className="relative bg-gray-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/25 max-w-md w-full overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <X size={24} />
                </button>

                {/* Content */}
                <div className="p-8 text-center">
                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                                <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        Payment Successful!
                    </h2>

                    {/* Subtitle */}
                    <p className="text-gray-400 text-base mb-8">
                        Your purchase has been completed successfully
                    </p>

                    {/* Plan Info Card */}
                    <div className="bg-gray-800/50 border border-purple-500/30 rounded-xl p-6 mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <Sparkles size={20} className="text-yellow-400 mr-2" />
                            <span className="text-xl font-semibold text-purple-300">
                                {checkoutResultDialogData.planName}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {/* Price */}
                            <div className="flex justify-between items-center text-gray-300">
                                <span className="text-sm">Amount Paid</span>
                                <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                                    ${(checkoutResultDialogData.price / 100).toFixed(2)}
                                </span>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-purple-500/20"></div>

                            {/* Credits */}
                            <div className="flex justify-between items-center text-gray-300">
                                <span className="text-sm">Credits Added</span>
                                <span className="text-lg font-bold text-purple-400">
                                    +{checkoutResultDialogData.creditCount} credits
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <button
                        onClick={onClickConfirm}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
                    >
                        Got it!
                    </button>
                </div>

                {/* Bottom Gradient Border Effect */}
                <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
            </div>
        </div>
    )
}

export default memo(CheckoutResultDialog);