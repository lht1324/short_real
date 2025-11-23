'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {SubscriptionPlan} from "@/api/types/supabase/Users";
import {CreditCard, Crown, Calendar, Mail, User as UserIcon, Receipt, FileText, Settings} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import {polarClientAPI} from "@/api/client/polarClientAPI";
import {OrderData} from "@/api/types/api/polar/orders/GetPolarOrdersResponse";
import OrderItem from "@/components/page/profile/OrderItem";
import {SubscriptionData} from "@/api/types/api/polar/subscriptions/SubscriptionData";
import ChangePlanModal from "@/components/page/profile/ChangePlanModal";
import {useRouter} from "next/navigation";
import {ProductData} from "@/api/types/api/polar/products/ProductData";

function ProfilePageClient() {
    const router = useRouter();

    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);

    const [showChangePlanModal, setShowChangePlanModal] = useState(false);

    const [orderList, setOrderList] = useState<OrderData[]>([]);
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

    const [scheduledDowngradeProductData, setScheduledDowngradeProductData] = useState<ProductData | null>(null);

    const planDisplayName = useMemo(() => {
        return subscriptionData?.productName ?? "-";
    }, [subscriptionData]);

    const isPremiumPlan = useMemo(() => {
        return user?.plan && user.plan !== SubscriptionPlan.NONE;
    }, [user?.plan]);

    const isDowngradeScheduled = useMemo(() => {
        return !!user?.scheduled_downgrade_at && !!user?.downgrade_target_plan_id;
    }, [user?.scheduled_downgrade_at, user?.downgrade_target_plan_id]);

    const formattedDate = useMemo(() => {
        return user?.created_at
            ? new Date(user?.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : "-";
    }, [user?.created_at]);

    // Subscription 관련 메모이제이션
    const subscriptionStatus = useMemo(() => {
        if (!subscriptionData) return null;

        const statusMap: Record<string, { label: string; color: string }> = {
            'active': { label: 'Active', color: 'text-green-400' },
            'trialing': { label: 'Trial', color: 'text-blue-400' },
            'past_due': { label: 'Past Due', color: 'text-yellow-400' },
            'canceled': { label: 'Canceled', color: 'text-red-400' },
            'unpaid': { label: 'Unpaid', color: 'text-red-400' },
            'incomplete': { label: 'Incomplete', color: 'text-gray-400' },
            'incomplete_expired': { label: 'Expired', color: 'text-gray-400' },
        };

        return statusMap[subscriptionData.status] || { label: subscriptionData.status, color: 'text-gray-400' };
    }, [subscriptionData]);

    const billingCycleText = useMemo(() => {
        if (!subscriptionData) return null;

        const cycleMap: Record<string, string> = {
            'day': 'Daily',
            'week': 'Weekly',
            'month': 'Monthly',
            'year': 'Yearly',
        };

        const cycleName = cycleMap[subscriptionData.billingCycle] || subscriptionData.billingCycle;

        if (subscriptionData.billingInterval === 1) {
            return cycleName;
        }

        return `Every ${subscriptionData.billingInterval} ${subscriptionData.billingCycle}s`;
    }, [subscriptionData]);

    const priceText = useMemo(() => {
        if (!subscriptionData) return null;

        const amount = (subscriptionData.amount / 100).toFixed(2);
        const currency = subscriptionData.currency.toUpperCase();

        return `${currency} $${amount}`;
    }, [subscriptionData]);

    const nextBillingDate = useMemo(() => {
        if (!subscriptionData?.currentPeriodEnd) return null;

        return new Date(subscriptionData.currentPeriodEnd).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [subscriptionData?.currentPeriodEnd]);

    const subscriptionStartDate = useMemo(() => {
        if (!subscriptionData?.createdAt) return null;

        return new Date(subscriptionData.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [subscriptionData?.createdAt]);

    const scheduledDowngradeDate = useMemo(() => {
        if (!user?.scheduled_downgrade_at) return null;

        return new Date(user.scheduled_downgrade_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [user?.scheduled_downgrade_at]);

    const scheduledDowngradePriceText = useMemo(() => {
        if (!scheduledDowngradeProductData) return null;

        const amount = (scheduledDowngradeProductData.price / 100).toFixed(2);
        const currency = scheduledDowngradeProductData.currency.toUpperCase();

        return `${currency} $${amount}`;
    }, [scheduledDowngradeProductData]);

    const onClickChangePlan = useCallback(() => {
        setShowChangePlanModal(true);
    }, []);

    const onConfirmChangePlan = useCallback(async (newProductId: string) => {
        setIsLoading(true);

        try {
            const userId = user?.id;
            const subscriptionId = subscriptionData?.id;
            const prevProductId = subscriptionData?.productId;

            // 필수 값 체크
            if (!userId) {
                alert("User information is missing. Please try logging in again.");
                return;
            }

            if (!subscriptionId || !prevProductId) {
                alert("Subscription information is missing. Please refresh the page and try again.");
                return;
            }

            // API 호출
            const postPolarSubscriptionsChangeResult = await polarClientAPI.postPolarSubscriptionsChange(
                userId,
                subscriptionId,
                prevProductId,
                newProductId
            );

            if (!postPolarSubscriptionsChangeResult) {
                alert("Failed to change subscription plan. Please try again later.");
                return;
            }

            // 성공 시 후처리
            alert("Your subscription plan has been successfully updated!");

            // 모달 닫기
            setShowChangePlanModal(false);

            // 구독 데이터 새로고침
            if (user?.email) {
                const updatedSubscriptionData = await polarClientAPI.getPolarSubscriptionByEmail(user.email);
                setSubscriptionData(updatedSubscriptionData);
            }
        } catch (error) {
            console.error("Error changing subscription plan:", error);
            alert("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, user?.email, subscriptionData?.id, subscriptionData?.productId]);

    useEffect(() => {
        if (user?.email) {
            const loadData = async () => {
                const mockOrderDataList: OrderData[] = [
                    {
                        "productName": "Daily × 2",
                        "totalAmount": 8900,
                        "currency": "usd",
                        "status": "paid",
                        "createdAt": "2025-11-17T17:44:00.166Z"
                    },
                    {
                        "productName": "Pro Plan",
                        "totalAmount": 29900,
                        "currency": "usd",
                        "status": "paid",
                        "createdAt": "2025-10-15T09:23:11.442Z"
                    },
                    {
                        "productName": "Starter Pack",
                        "totalAmount": 4900,
                        "currency": "usd",
                        "status": "refunded",
                        "createdAt": "2025-09-03T14:12:33.789Z"
                    },
                    {
                        "productName": "Enterprise License",
                        "totalAmount": 99900,
                        "currency": "usd",
                        "status": "paid",
                        "createdAt": "2025-08-20T11:05:47.221Z"
                    },
                    {
                        "productName": "Monthly Subscription",
                        "totalAmount": 19900,
                        "currency": "usd",
                        "status": "partially_refunded",
                        "createdAt": "2025-07-28T16:38:22.556Z"
                    },
                    {
                        "productName": "Basic × 5",
                        "totalAmount": 12500,
                        "currency": "usd",
                        "status": "paid",
                        "createdAt": "2025-06-14T08:41:09.334Z"
                    },
                    {
                        "productName": "Premium Annual",
                        "totalAmount": 199900,
                        "currency": "usd",
                        "status": "pending",
                        "createdAt": "2025-11-19T03:15:44.892Z"
                    },
                    {
                        "productName": "Team Plan × 3",
                        "totalAmount": 79900,
                        "currency": "usd",
                        "status": "paid",
                        "createdAt": "2025-05-02T12:29:58.113Z"
                    },
                    {
                        "productName": "Add-on Bundle",
                        "totalAmount": 15900,
                        "currency": "usd",
                        "status": "paid",
                        "createdAt": "2025-11-10T19:56:21.667Z"
                    }
                ];

                const orderList = await polarClientAPI.getPolarOrders(user.email);
                const testOrderList = [
                    ...mockOrderDataList,
                    ...(orderList ?? []),
                ]

                const subscriptionData = await polarClientAPI.getPolarSubscriptionByEmail(user.email);

                // setOrderList(orderList ?? []);
                setOrderList(testOrderList.sort((a, b) => {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }));
                setSubscriptionData(subscriptionData);
            }

            loadData().then(() => {
                setIsLoading(false);
            }).catch(() => {
                router.refresh();
            });
        }
    }, [user?.email, router]);

    useEffect(() => {
        if (!user?.email) return;

        const loadSubscriptionData = async () => {
            const newSubscriptionData = await polarClientAPI.getPolarSubscriptionByEmail(user.email);

            if (!newSubscriptionData) return;

            setSubscriptionData(newSubscriptionData);
        }

        loadSubscriptionData().then();
    }, [user?.downgrade_target_plan_id, user?.email]);

    useEffect(() => {
        if (isDowngradeScheduled) {
            const loadProductDataList = async () => {
                const newProductDataList = await polarClientAPI.getPolarProducts();

                const scheduledProductData = newProductDataList?.find((productData) => {
                    return productData.id === user?.downgrade_target_plan_id;
                }) ?? null;

                setScheduledDowngradeProductData(scheduledProductData);
            }

            loadProductDataList().then();
        }
    }, [isDowngradeScheduled, user?.downgrade_target_plan_id]);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header Section */}
                <div className="mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                        My <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Profile</span>
                    </h1>
                    <p className="text-xl text-gray-400">
                        Manage your account and subscription
                    </p>
                </div>

                {/* User Info Card */}
                <div className="mb-8 p-8 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className="w-24 h-24 rounded-full border-2 border-purple-500/50"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                                    <UserIcon size={40} className="text-white" />
                                </div>
                            )}
                            {isPremiumPlan && (
                                <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-black">
                                    <Crown size={16} className="text-white" />
                                </div>
                            )}
                        </div>

                        {/* User Details */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2">{user?.name}</h2>
                            <div className="flex items-center gap-2 text-gray-400">
                                <Mail size={16} />
                                <span>{user?.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Credit Count Card */}
                    <div className="p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm hover:border-purple-400/50 hover:bg-gray-800/50 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <CreditCard size={24} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Credits</h3>
                        </div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            {user?.credit_count ?? 0}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">Available credits</p>
                    </div>

                    {/* Plan Card */}
                    <div className="p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm hover:border-purple-400/50 hover:bg-gray-800/50 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Crown size={24} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Plan</h3>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {planDisplayName}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            {subscriptionData?.productDescription ?? "-"}
                        </p>
                    </div>

                    {/* Member Since Card */}
                    <div className="p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm hover:border-purple-400/50 hover:bg-gray-800/50 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                <Calendar size={24} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Member Since</h3>
                        </div>
                        <div className="text-xl font-bold text-white">
                            {formattedDate}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">Account creation date</p>
                    </div>
                </div>

                {/* 2 Column Layout: Subscription & Payment History */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Subscription Details & Manage */}
                    <div className="space-y-6 md:col-span-1">
                        {/* Cancel Warning Banner */}
                        {isPremiumPlan && !isDowngradeScheduled && subscriptionData?.cancelAtPeriodEnd && (
                            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-white text-sm font-bold">!</span>
                                    </div>
                                    <div>
                                        <h4 className="text-red-400 font-semibold mb-1">Subscription Ending</h4>
                                        <p className="text-red-300/80 text-sm">
                                            Your subscription will end on {nextBillingDate || 'the current period end'}.
                                            {subscriptionData.canceledAt && (
                                                <span className="block mt-1 text-xs text-red-400/60">
                                                    Canceled on {new Date(subscriptionData.canceledAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subscription Details Section */}
                        {isPremiumPlan && subscriptionData && (
                            <div className="p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                                        <FileText size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white">Subscription Details</h3>
                                </div>
                                <div className="space-y-3 text-gray-300">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                        <span className="text-gray-400">Status</span>
                                        <span className={`font-semibold ${subscriptionStatus?.color || 'text-gray-400'}`}>
                                            {subscriptionStatus?.label || '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                        <span className="text-gray-400">Current Plan</span>
                                        <span className="font-semibold">{planDisplayName}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                        <span className="text-gray-400">Price</span>
                                        <span className="font-semibold">{priceText || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                        <span className="text-gray-400">Billing Cycle</span>
                                        <span className="font-semibold">{billingCycleText || '-'}</span>
                                    </div>
                                    {nextBillingDate && (
                                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                            <span className="text-gray-400">Next Billing Date</span>
                                            <span className="font-semibold">{nextBillingDate}</span>
                                        </div>
                                    )}
                                    {subscriptionStartDate && (
                                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                                            <span className="text-gray-400">Subscription Start</span>
                                            <span className="font-semibold">{subscriptionStartDate}</span>
                                        </div>
                                    )}

                                    {/* 예약된 다운그레이드 정보 */}
                                    {isDowngradeScheduled && scheduledDowngradeProductData && (
                                        <div className="mt-4 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                                            <div className="flex items-start gap-2 mb-3">
                                                <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Calendar size={12} className="text-black" />
                                                </div>
                                                <h4 className="text-yellow-400 font-semibold text-sm">Scheduled Plan Change</h4>
                                            </div>
                                            <div className="space-y-2 text-sm ml-7">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-yellow-300/80">Next Plan</span>
                                                    <span className="font-semibold text-yellow-200">{scheduledDowngradeProductData.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-yellow-300/80">New Price</span>
                                                    <span className="font-semibold text-yellow-200">{scheduledDowngradePriceText || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-yellow-300/80">Change Date</span>
                                                    <span className="font-semibold text-yellow-200">{scheduledDowngradeDate || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Subscription Manage Section */}
                        {isPremiumPlan && (
                            <div className="p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                                        <Settings size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white">Subscription Manage</h3>
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={onClickChangePlan}
                                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02]"
                                    >
                                        Change Plan
                                    </button>
                                    <button
                                        onClick={() => {}}
                                        className="w-full py-3 px-4 rounded-lg border border-red-500/50 text-red-400 font-semibold hover:bg-red-500/10 hover:border-red-400 transition-all duration-300"
                                    >
                                        Cancel Subscription
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Upgrade CTA for Free Users */}
                        {!isPremiumPlan && (
                            <div className="p-8 rounded-xl border border-purple-500/30 bg-gradient-to-r from-pink-500/10 to-purple-600/10 backdrop-blur-sm text-center">
                                <h3 className="text-2xl font-bold text-white mb-2">Upgrade Your Plan</h3>
                                <p className="text-gray-300 mb-6">
                                    Unlock premium features and create more videos every day
                                </p>
                                <button
                                    onClick={() => window.location.href = '/#pricing'}
                                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                                >
                                    View Plans
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Payment History */}
                    {orderList.length > 0 && (
                        <div className="p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <Receipt size={20} className="text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Payment History</h3>
                            </div>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {orderList.map((order, index) => (
                                    <OrderItem key={index} orderData={order} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showChangePlanModal && <ChangePlanModal
                userCurrentProductName={subscriptionData?.productName ?? null}
                onConfirmChangePlan={onConfirmChangePlan}
                onClickClose={() => {
                    setShowChangePlanModal(false);
                }}
            />}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-lg">
                    <div className="flex flex-col items-center gap-6">
                        {/* Spinner */}
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 animate-spin"></div>
                        </div>
                        {/* Loading Text */}
                        <div className="text-center">
                            <p className="text-xl font-semibold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                                Loading...
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Please wait while we load your profile
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(ProfilePageClient);