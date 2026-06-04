import {memo, useEffect, useMemo} from "react";
import {OrderData} from "@/lib/api/types/api/polar/orders/GetPolarOrdersResponse";
import {CheckCircle2, Clock, RotateCcw} from "lucide-react";

interface OrderItemProps {
    orderData: OrderData;
}

function OrderItem({
    orderData,
}: OrderItemProps) {
    const formattedDate = useMemo(() => {
        return new Date(orderData.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, [orderData.createdAt]);

    const formattedAmount = useMemo(() => {
        // totalAmount는 센트 단위이므로 100으로 나눔
        const amount = orderData.totalAmount / 100;
        const fixedAmount = amount % 1 === 0
            ? amount.toFixed(0)
            : amount.toFixed(2);

        return `${fixedAmount} ${orderData.currency.toUpperCase()}`;
    }, [orderData.totalAmount, orderData.currency]);

    const statusInfo = useMemo(() => {
        switch (orderData.status.toLowerCase()) {
            case 'paid':
                return {
                    icon: <CheckCircle2 size={20} className="text-green-400" />,
                    text: 'Paid',
                    color: 'text-green-400'
                };
            case 'pending':
                return {
                    icon: <Clock size={20} className="text-yellow-400" />,
                    text: 'Pending',
                    color: 'text-yellow-400'
                };
            case 'refunded':
                return {
                    icon: <RotateCcw size={20} className="text-red-400" />,
                    text: 'Refunded',
                    color: 'text-red-400'
                };
            case 'partially_refunded':
                return {
                    icon: <RotateCcw size={20} className="text-orange-400" />,
                    text: 'Partially Refunded',
                    color: 'text-orange-400'
                };
            default:
                return {
                    icon: <Clock size={20} className="text-gray-400" />,
                    text: orderData.status,
                    color: 'text-gray-400'
                };
        }
    }, [orderData.status]);

    return (
        <div className="grid grid-cols-4 gap-4 items-center p-4 rounded-xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/40 transition-all duration-300">
            {/* 제품명 */}
            <div className="min-w-0">
                <p className="text-zinc-100 font-medium truncate">{orderData.productName}</p>
            </div>

            {/* 금액 */}
            <div className="text-end">
                <p className="text-zinc-100 font-semibold">{formattedAmount}</p>
            </div>

            {/* 상태 */}
            <div className="flex items-center justify-start gap-2 ml-4">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color.replace('text-', 'border-').replace('-400', '-500/30')} ${statusInfo.color.replace('-400', '-500/10')} ${statusInfo.color} uppercase tracking-wider`}>
                    {statusInfo.text}
                </span>
            </div>

            {/* 날짜 */}
            <div>
                <p className="text-[13px] text-end text-zinc-500 font-medium">{formattedDate}</p>
            </div>
        </div>
    );
}

export default memo(OrderItem);