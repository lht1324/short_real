'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {SubscriptionPlan} from "@/lib/api/types/supabase/Users";
import {CreditCard, Crown, Calendar, Mail, User as UserIcon, Receipt, FileText, Settings, Sparkles, Loader2, Bot, Save, ExternalLink, CheckCircle2, Shield, Share2, Trash2, Plus} from "lucide-react";
import {useAuth} from "@/context/AuthContext";
import {polarClientAPI} from "@/lib/api/client/polarClientAPI";
import {OrderData} from "@/lib/api/types/api/polar/orders/GetPolarOrdersResponse";
import OrderItem from "@/components/page/profile/OrderItem";
import {SubscriptionData} from "@/lib/api/types/api/polar/subscriptions/SubscriptionData";
import ChangePlanModal from "@/components/page/profile/ChangePlanModal";
import {useRouter} from "next/navigation";
import {ProductData} from "@/lib/api/types/api/polar/products/ProductData";
import Image from "next/image";
import DefaultModal from "@/components/public/DefaultModal";
import {aiModelDataClientAPI} from "@/lib/api/client/aiModelDataClientAPI";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {usersClientAPI} from "@/lib/api/client/usersClientAPI";
import {getFetch, deleteFetch} from "@/lib/api/client/baseFetch";

const FalIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="24" height="24" fill="rgb(240, 196, 216)" rx="4"/>
        <path clipRule="evenodd" d="M15.477 0c.415 0 .749.338.788.752a7.775 7.775 0 006.985 6.984c.413.04.752.373.752.788v6.952c0 .415-.338.748-.752.788a7.775 7.775 0 00-6.985 6.984c-.04.414-.373.752-.788.752H8.525c-.416 0-.749-.338-.789-.752a7.775 7.775 0 00-6.984-6.984c-.414-.04-.752-.373-.752-.788V8.524c0-.415.338-.748.752-.788A7.775 7.775 0 007.736.752C7.776.338 8.11 0 8.526 0h6.95zM4.819 11.98a7.226 7.226 0 007.223 7.23 7.226 7.226 0 007.223-7.23c0-3.994-3.234-7.23-7.223-7.23a7.227 7.227 0 00-7.223 7.23z" fill="#EC0648" fillRule="evenodd" transform="translate(4, 4) scale(0.66)"/>
    </svg>
);

const ReplicateIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="24" height="24" fill="rgb(202, 44, 18)" rx="4"/>
        <path d="M22 10.552v2.26h-7.932V22H11.54V10.552H22zM22 2v2.264H4.528V22H2V2h20zm0 4.276V8.54H9.296V22H6.768V6.276H22z" fill="#ffffff" transform="translate(3, 3) scale(0.75)"/>
    </svg>
);

const YouTubeIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="24" height="24" fill="rgb(230, 0, 0)" rx="4"/>
        <path d="M19 12a1 1 0 00-.06-.34l-8.5-5A1 1 0 009 7.5v9a1 1 0 001.44.89l8.5-5c.34-.2.56-.54.56-.89z" fill="#ffffff" transform="scale(0.8) translate(3, 3)"/>
    </svg>
);

const TikTokIcon = ({ size = 20, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect width="24" height="24" fill="rgb(0, 0, 0)" rx="4"/>
        <path d="M16.6 9c1.3 0 2.4.8 2.4.8V7.3s-1.1-.3-2.1-.3v-2h-2v7.9c0 1.2-.9 2.1-2.1 2.1S10.7 14 10.7 12.8s.9-2.1 2.1-2.1v-2c-2.3 0-4.1 1.8-4.1 4.1s1.8 4.1 4.1 4.1 4.1-1.8 4.1-4.1V9h1.7z" fill="#ffffff" transform="scale(0.9) translate(1, 1)"/>
    </svg>
);

function ProfilePageClient() {
    const router = useRouter();

    const { user, refreshUser } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [isSavingKeys, setIsSavingKeys] = useState(false);

    // API Key Edit states
    const [isEditingFalKey, setIsEditingFalKey] = useState(false);
    const [falKeyInput, setFalKeyInput] = useState("");

    const [showChangePlanModal, setShowChangePlanModal] = useState(false);
    const [showCancelSubscriptionModal, setShowCancelSubscriptionModal] = useState(false);

    const [orderList, setOrderList] = useState<OrderData[]>([]);
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

    const [scheduledDowngradeProductData, setScheduledDowngradeProductData] = useState<ProductData | null>(null);

    // AI Model states
    const [aiModelList, setAiModelList] = useState<AIModelData[]>([]);
    const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
    const [selectedI2iId, setSelectedI2iId] = useState<string | null>(null);
    const [selectedI2vId, setSelectedI2vId] = useState<string | null>(null);

    // Social Channels states
    const [youtubeChannels, setYoutubeChannels] = useState<any[]>([]);
    const [tiktokAccounts, setTiktokAccounts] = useState<any[]>([]);
    const [isDeletingTokenId, setIsDeletingTokenId] = useState<string | null>(null);
    const [isDeletingPlatform, setIsDeletingPlatform] = useState<"youtube" | "tiktok" | null>(null);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const isUserRegisteredFalAi = useMemo(() => {
        return !!(user?.fal_ai_api_key)
    }, [user?.fal_ai_api_key])

    const planDisplayName = useMemo(() => {
        return subscriptionData?.productName ?? "No Subscription";
    }, [subscriptionData]);

    const isPremiumPlan = useMemo(() => {
        return orderList.length !== 0 && !!subscriptionData;
    }, [orderList.length, subscriptionData]);

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

    const loadOrders = useCallback(async (email: string) => {
        const orders = await polarClientAPI.getPolarOrders(email);
        setOrderList(orders?.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }) ?? []);
    }, []);

    const loadSubscription = useCallback(async (email: string) => {
        const subscription = await polarClientAPI.getPolarSubscriptionByEmail(email);
        setSubscriptionData(subscription);
    }, []);

    const loadScheduledProduct = useCallback(async () => {
        if (!isDowngradeScheduled || !user?.downgrade_target_plan_id) {
            setScheduledDowngradeProductData(null);
            return;
        }
        const products = await polarClientAPI.getPolarProducts();
        const scheduledProduct = products?.find((p) => p.id === user.downgrade_target_plan_id) ?? null;
        setScheduledDowngradeProductData(scheduledProduct);
    }, [isDowngradeScheduled, user?.downgrade_target_plan_id]);

    const fetchAIModels = useCallback(async () => {
        try {
            const models = await aiModelDataClientAPI.getAIModelData();
            setAiModelList(models);

            if (user?.preferred_ai_model_config && user.preferred_ai_model_config.referenceImageModelId) {
                setSelectedReferenceId(user.preferred_ai_model_config.referenceImageModelId);
                setSelectedI2iId(user.preferred_ai_model_config.sceneImageI2IModelId);
                setSelectedI2vId(user.preferred_ai_model_config.videoModelId);
            } else {
                setSelectedReferenceId('d59b7307-ab54-4efd-82f5-62649c2976cc');
                setSelectedI2iId('918afd0a-cc7d-41dc-ad42-914c224ef04b');
                setSelectedI2vId('b5382c55-f9bb-45e9-bfcf-7b98224ae81c');
            }
        } catch (error) {
            console.error("Failed to load AI models:", error);
        }
    }, [user?.preferred_ai_model_config]);

    const loadSocialChannels = useCallback(async () => {
        if (!user?.id) return;
        try {
            const ytRes = await getFetch(`/api/user/${user.id}/social-channels?platform=youtube`);
            const ytData = await ytRes.json();
            if (ytData.success) {
                setYoutubeChannels(ytData.data?.channels || []);
            }

            const ttRes = await getFetch(`/api/user/${user.id}/social-channels?platform=tiktok`);
            const ttData = await ttRes.json();
            if (ttData.success) {
                setTiktokAccounts(ttData.data?.channels || []);
            }
        } catch (error) {
            console.error("Failed to load social channels:", error);
        }
    }, [user?.id]);

    const onClickDisconnect = useCallback((tokenId: string, platform: "youtube" | "tiktok") => {
        setIsDeletingTokenId(tokenId);
        setIsDeletingPlatform(platform);
        setShowDisconnectModal(true);
    }, []);

    const onConfirmDisconnect = useCallback(async () => {
        if (!user?.id || !isDeletingTokenId || !isDeletingPlatform) return;
        
        setIsDisconnecting(true);
        try {
            const res = await deleteFetch(
                `/api/user/${user.id}/social-channels?tokenId=${encodeURIComponent(isDeletingTokenId)}&platform=${isDeletingPlatform}`
            );
            const data = await res.json();
            if (data.success) {
                alert(`Successfully disconnected.`);
                await loadSocialChannels();
            } else {
                throw new Error(data.error || "Failed to disconnect account.");
            }
        } catch (error) {
            console.error("Error disconnecting account:", error);
            alert(error instanceof Error ? error.message : "Failed to disconnect. Try again.");
        } finally {
            setIsDisconnecting(false);
            setShowDisconnectModal(false);
            setIsDeletingTokenId(null);
            setIsDeletingPlatform(null);
        }
    }, [user?.id, isDeletingTokenId, isDeletingPlatform, loadSocialChannels]);

    const onClickConnectYoutube = useCallback(() => {
        if (!user?.id) return;
        window.location.href = `/api/video/export/youtube/manual/oauth?mode=profile`;
    }, [user?.id]);

    const onClickConnectTiktok = useCallback(() => {
        if (!user?.id) return;
        window.location.href = `/api/video/export/tiktok/manual/oauth?mode=profile`;
    }, [user?.id]);

    const loadAllData = useCallback(async () => {
        if (!user?.email) return;
        
        setIsLoading(true);
        try {
            await Promise.all([
                loadOrders(user.email),
                loadSubscription(user.email),
                loadScheduledProduct(),
                fetchAIModels(),
                loadSocialChannels()
            ]);
        } catch (error) {
            console.error("Error loading profile data:", error);
            router.refresh();
        } finally {
            setIsLoading(false);
        }
    }, [user?.email, loadOrders, loadSubscription, loadScheduledProduct, fetchAIModels, loadSocialChannels, router]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const socialPlatforms = useMemo(() => {
        return [
            {
                id: "youtube" as const,
                name: "YouTube",
                icon: <YouTubeIcon size={24} />,
                items: youtubeChannels,
                emptyText: "No YouTube channels connected.",
                connectLabel: youtubeChannels.length > 0 ? "Link channel" : "Connect YouTube",
                onConnect: onClickConnectYoutube
            },
            {
                id: "tiktok" as const,
                name: "TikTok",
                icon: <TikTokIcon size={24} />,
                items: tiktokAccounts,
                emptyText: "No TikTok accounts connected.",
                connectLabel: tiktokAccounts.length > 0 ? "Link account" : "Connect TikTok",
                onConnect: onClickConnectTiktok
            }
        ];
    }, [youtubeChannels, tiktokAccounts, onClickConnectYoutube, onClickConnectTiktok]);

    const gridColsClass = useMemo(() => {
        if (socialPlatforms.length === 2) {
            return "grid grid-cols-1 md:grid-cols-2 gap-8";
        }
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    }, [socialPlatforms.length]);

    const onClickChangePlan = useCallback(() => {
        setShowChangePlanModal(true);
    }, []);

    const onClickCancelSubscription = useCallback(() => {
        // subscriptionData?.cancelAtPeriodEnd
        // 종료 예정이면 이미 예약 걸렸다는 메시지 추가?
        setShowCancelSubscriptionModal(true);
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
                setIsLoading(false);
                return;
            }

            if (!subscriptionId || !prevProductId) {
                alert("Subscription information is missing. Please refresh the page and try again.");
                setIsLoading(false);
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
                setIsLoading(false);
                return;
            }

            // 성공 시 후처리
            alert("Your subscription plan has been successfully updated!");

            // 모달 닫기
            setShowChangePlanModal(false);

            // 구독 데이터 새로고침
            await loadAllData();
        } catch (error) {
            console.error("Error changing subscription plan:", error);
            alert("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, subscriptionData?.id, subscriptionData?.productId, loadAllData]);

    const onConfirmCancelSubscription = useCallback(async () => {
        setShowCancelSubscriptionModal(false);

        if (!subscriptionData?.id) {
            alert("Your subscription is invalid. Try again.");
            return;
        }

        if (subscriptionData?.cancelAtPeriodEnd === true) {
            alert("Your subscription was already canceled and is waiting the end of month.");
            return;
        }

        setIsLoading(true);

        const deletePolarSubscriptionsCancelResult = await polarClientAPI.deletePolarSubscriptionsCancel(subscriptionData?.id);

        if (deletePolarSubscriptionsCancelResult) {
            alert("Your subscription has been canceled successfully. It will remain active until the end of the current billing period.");
            // 구독 데이터 새로고침
            if (user?.email) await loadSubscription(user.email);
        } else {
            alert("Failed to cancel subscription. Please try again later.");
        }
        
        setIsLoading(false);
    }, [subscriptionData?.id, subscriptionData?.cancelAtPeriodEnd, user?.email, loadSubscription]);

    const onClickSavePreferences = useCallback(async () => {
        if (!user?.id || !selectedReferenceId || !selectedI2iId || !selectedI2vId) return;

        setIsSavingPrefs(true);
        try {
            const selectedI2iModel = aiModelList.find(m => m.id === selectedI2iId);
            const companionT2iModel = aiModelList.find(
                m => m.category === 'text-to-image' && m.display_name === selectedI2iModel?.display_name
            );
            const inferredSceneT2iId = companionT2iModel?.id ?? '1bd90bd4-e476-40e9-8a1e-1649288786e7';

            const result = await usersClientAPI.patchUserByUserId(user.id, {
                preferred_ai_model_config: {
                    referenceImageModelId: selectedReferenceId,
                    sceneImageT2IModelId: inferredSceneT2iId,
                    sceneImageI2IModelId: selectedI2iId,
                    videoModelId: selectedI2vId
                }
            });

            if (result) {
                await refreshUser();
                alert("Preferences saved successfully.");
            } else {
                throw new Error("Failed to save preferences");
            }
        } catch (error) {
            console.error("Error saving preferences:", error);
            alert("Failed to save preferences. Please try again.");
        } finally {
            setIsSavingPrefs(false);
        }
    }, [user?.id, selectedReferenceId, selectedI2iId, selectedI2vId, refreshUser, aiModelList]);

    const onClickSaveFalKey = useCallback(async () => {
        if (!user?.id || !falKeyInput.trim()) return;

        // 이미 키가 등록되어 있고, 입력값이 마스킹 텍스트 그대로인 경우 저장 API 생략
        if (isUserRegisteredFalAi && falKeyInput.trim() === "************") {
            setIsEditingFalKey(false);
            setFalKeyInput("");
            return;
        }

        setIsSavingKeys(true);
        try {
            const result = await usersClientAPI.patchUserApiKey(user.id, falKeyInput.trim());

            if (result.success) {
                await refreshUser();
                setIsEditingFalKey(false);
                setFalKeyInput("");
                alert("API Key saved successfully.");
            } else {
                throw new Error(result.error || "Failed to save key");
            }
        } catch (error) {
            console.error("Error saving API Key:", error);
            alert(error instanceof Error ? error.message : "Failed to save API Key. Please try again.");
        } finally {
            setIsSavingKeys(false);
        }
    }, [user?.id, isUserRegisteredFalAi, falKeyInput, refreshUser]);

    const t2iModels = useMemo(() => aiModelList.filter(m => m.category === 'text-to-image'), [aiModelList]);
    const i2iModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-image'), [aiModelList]);
    const i2vModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-video'), [aiModelList]);

    return (
        <div className="min-h-screen pt-16 bg-zinc-950 text-white relative overflow-hidden">
            {/* Background Effects - Toned down significantly */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 z-10">
                {/* Header Section */}
                <div className="mb-10">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-zinc-100">
                        My Profile
                    </h1>
                    <p className="text-base text-zinc-500">
                        Manage your account and workspace preferences.
                    </p>
                </div>

                {/* User Info & Stats Panel */}
                <div className="mb-8 rounded-2xl border border-white/5 bg-zinc-900/40 overflow-hidden">
                    {/* User Profile Info */}
                    <div className="p-8 border-b border-white/5">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="relative">
                                {user?.avatar_url ? (
                                    <Image
                                        src={user.avatar_url}
                                        alt={user.name}
                                        width={80}
                                        height={80}
                                        className="w-20 h-20 rounded-full border border-white/10 shadow-sm"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-zinc-800/50 border border-white/5 flex items-center justify-center">
                                        <UserIcon size={32} className="text-zinc-600" />
                                    </div>
                                )}
                                {isPremiumPlan && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-lg">
                                        <Crown size={12} className="text-zinc-950" />
                                    </div>
                                )}
                            </div>

                            {/* User Details */}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-zinc-100 mb-1">{user?.name}</h2>
                                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                    <Mail size={14} />
                                    <span>{user?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary Row (Flattened) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                        <div className="p-6 flex flex-col items-center md:items-start group">
                            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Compute Engine</div>
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <FalIcon size={28} />
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${user?.fal_ai_api_key ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-zinc-100 tracking-tight leading-none mb-1">fal.ai</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border w-fit ${user?.fal_ai_api_key ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-zinc-800 bg-zinc-900 text-zinc-600'} uppercase`}>
                                        {user?.fal_ai_api_key ? 'Connected' : 'Missing'}
                                    </span>
                                </div>
                            </div>
                            {user?.fal_ai_api_key && (
                                <a 
                                    href="https://fal.ai/dashboard/usage-billing/credits" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 mt-4 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    <span>Manage billing & credits</span>
                                    <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                        <div className="p-6 flex flex-col items-center md:items-start">
                            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Current Plan</div>
                            <div className="text-xl font-semibold text-zinc-200">{planDisplayName}</div>
                            <p className="text-[11px] text-zinc-600 mt-1 truncate max-w-full">
                                {subscriptionData?.productDescription || "Free Tier"}
                            </p>
                        </div>
                        <div className="p-6 flex flex-col items-center md:items-start">
                            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Member Since</div>
                            <div className="text-xl font-semibold text-zinc-200">{formattedDate}</div>
                        </div>
                    </div>
                </div>

                {/* Workspace Preferences Section */}
                <div className="mb-8 p-8 rounded-2xl border border-white/5 bg-zinc-900/40">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <Bot size={20} className="text-zinc-500" />
                            <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Workspace Preferences</h3>
                        </div>
                        <button
                            onClick={onClickSavePreferences}
                            disabled={isSavingPrefs}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all disabled:opacity-50"
                        >
                            {isSavingPrefs ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>Save Preferences</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">Default Character Model (T2I)</label>
                            <select
                                value={selectedReferenceId || ''}
                                onChange={(e) => setSelectedReferenceId(e.target.value)}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                            >
                                {t2iModels.map(m => (
                                    <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">Default Scene Model (I2I)</label>
                            <select
                                value={selectedI2iId || ''}
                                onChange={(e) => setSelectedI2iId(e.target.value)}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                            >
                                {i2iModels.map(m => (
                                    <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">Default Video Model (I2V)</label>
                            <select
                                value={selectedI2vId || ''}
                                onChange={(e) => setSelectedI2vId(e.target.value)}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                            >
                                {i2vModels.map(m => (
                                    <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="mt-6 text-[11px] text-zinc-600 leading-relaxed max-w-2xl">
                        These models will be selected by default when creating new videos or series. You can still override them individually during the creation process.
                    </p>
                </div>

                {/* Provider Authentication Section (BYOK) */}
                <div id="provider-authentication" className="mb-8 p-8 rounded-2xl border border-white/5 bg-zinc-900/40">
                    <div className="flex items-center gap-2.5 mb-8">
                        <Shield size={20} className="text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Provider Authentication</h3>
                    </div>

                    <div className="space-y-4">
                        {/* fal.ai Item */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center flex-shrink-0 shadow-inner">
                                    <FalIcon size={24} className={isUserRegisteredFalAi ? "" : "grayscale opacity-40"} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-zinc-100">fal.ai</span>
                                        {isUserRegisteredFalAi && <CheckCircle2 size={14} className="text-emerald-500" />}
                                    </div>
                                    <p className="text-[11px] text-zinc-500 font-medium tracking-tight">Advanced Text-to-Image & Image-to-Video Engine</p>
                                </div>
                            </div>

                            <div className="flex-1 md:max-w-md">
                                {isEditingFalKey ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="password"
                                            value={falKeyInput}
                                            onChange={(e) => setFalKeyInput(e.target.value)}
                                            placeholder="Enter your fal.ai API Key..."
                                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-base tracking-[0.2em] placeholder:tracking-normal placeholder:text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-colors"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={onClickSaveFalKey}
                                                disabled={isSavingKeys || !falKeyInput.trim()}
                                                className="px-4 py-2.5 bg-white text-black font-bold text-xs rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
                                            >
                                                {isSavingKeys ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                                            </button>
                                            <button
                                                onClick={() => { setIsEditingFalKey(false); setFalKeyInput(""); }}
                                                className="px-3 py-2.5 text-zinc-500 hover:text-zinc-300 font-bold text-xs transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-zinc-900/60 rounded-xl border border-white/5 group/key">
                                        <span className={`truncate font-mono ${isUserRegisteredFalAi ? "text-base tracking-[0.15em] text-zinc-400 select-none" : "text-sm text-zinc-500"}`}>
                                            {isUserRegisteredFalAi ? "●●●●●●●●●●●●" : "No Key Registered"}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setIsEditingFalKey(true);
                                            }}
                                            className="text-[11px] font-bold text-zinc-300 hover:text-white transition-colors px-2 py-1"
                                        >
                                            {isUserRegisteredFalAi ? "Update" : "Register Key"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Replicate Item (Coming Soon) */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/20 border border-white/5 opacity-60">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center flex-shrink-0 grayscale">
                                    <ReplicateIcon size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-zinc-400">Replicate</span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/50 uppercase tracking-tighter">Coming Soon</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-600 font-medium tracking-tight">Alternative High-Quality Generation Engine</p>
                                </div>
                            </div>
                            <div className="flex-1 md:max-w-md px-4 py-2.5 bg-zinc-900/30 rounded-xl border border-white/5 italic text-[11px] text-zinc-500 text-center md:text-left">
                                Replicate integration is currently under development.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connected Accounts Section */}
                <div id="connected-accounts" className="mb-8 p-8 rounded-2xl border border-white/5 bg-zinc-900/40">
                    <div className="flex items-center gap-2.5 mb-8">
                        <Share2 size={20} className="text-zinc-500" />
                        <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Connected Accounts</h3>
                    </div>

                    <div className={gridColsClass}>
                        {socialPlatforms.map((platform) => (
                            <div 
                                key={platform.id} 
                                className="p-6 rounded-2xl bg-zinc-950/30 border border-white/5 flex flex-col justify-between min-h-[220px]"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        {platform.icon}
                                        <span className="text-sm font-bold text-zinc-100">{platform.name}</span>
                                    </div>

                                    {platform.items.length > 0 ? (
                                        <div className="space-y-3">
                                            {platform.items.map((item) => (
                                                <div 
                                                    key={item.id} 
                                                    className="group relative flex items-center justify-between p-3 bg-zinc-950/60 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {item.avatarUrl ? (
                                                            <img 
                                                                src={item.avatarUrl} 
                                                                alt={item.displayName} 
                                                                className="w-8 h-8 rounded-full object-cover border border-white/10" 
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                                                                <UserIcon size={14} className="text-zinc-500" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-zinc-200 truncate">{item.displayName}</p>
                                                            {item.handleName && (
                                                                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.handleName}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => onClickDisconnect(item.id, platform.id)}
                                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-[0.98]"
                                                        title={`Disconnect ${platform.name}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/5 bg-zinc-950/10 rounded-xl text-center">
                                            <p className="text-xs text-zinc-500 mb-2">{platform.emptyText}</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={platform.onConnect}
                                    className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 bg-zinc-900 hover:bg-zinc-855 border border-white/5 text-zinc-300 text-xs font-bold rounded-lg transition-all active:scale-[0.98]"
                                >
                                    <Plus size={14} />
                                    <span>{platform.connectLabel}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2 Column Layout: Subscription & Payment History */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Subscription & Manage */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Cancel Warning Banner */}
                        {isPremiumPlan && !isDowngradeScheduled && subscriptionData?.cancelAtPeriodEnd && (
                            <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-red-500 text-[10px] font-bold">!</span>
                                    </div>
                                    <div>
                                        <h4 className="text-red-400 text-sm font-semibold mb-1">Subscription Ending</h4>
                                        <p className="text-red-300/60 text-xs leading-relaxed">
                                            Your subscription will end on {nextBillingDate}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subscription Details Section */}
                        {isPremiumPlan && subscriptionData && (
                            <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/40">
                                <div className="flex items-center gap-2.5 mb-6">
                                    <FileText size={18} className="text-zinc-500" />
                                    <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Subscription</h3>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <span className="text-zinc-500">Status</span>
                                        <span className={`font-medium ${subscriptionStatus?.color || 'text-zinc-400'}`}>
                                            {subscriptionStatus?.label || '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <span className="text-zinc-500">Price</span>
                                        <span className="text-zinc-200 font-medium">{priceText || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <span className="text-zinc-500">Billing Cycle</span>
                                        <span className="text-zinc-200 font-medium">{billingCycleText || '-'}</span>
                                    </div>
                                    {nextBillingDate && (
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-zinc-500">Next Billing</span>
                                            <span className="text-zinc-200 font-medium">{nextBillingDate}</span>
                                        </div>
                                    )}

                                    {subscriptionStartDate && (
                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                            <span className="text-zinc-500">Started on</span>
                                            <span className="text-zinc-200 font-medium">{subscriptionStartDate}</span>
                                        </div>
                                    )}

                                    {/* Scheduled Downgrade */}
                                    {isDowngradeScheduled && scheduledDowngradeProductData && (
                                        <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                            <div className="flex items-start gap-2 mb-3">
                                                <Calendar size={14} className="text-amber-500 mt-0.5" />
                                                <h4 className="text-amber-500 font-semibold text-xs uppercase tracking-wider">Scheduled Change</h4>
                                            </div>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-amber-200/50">Next Plan</span>
                                                    <span className="font-semibold text-amber-200">{scheduledDowngradeProductData.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-amber-200/50">New Price</span>
                                                    <span className="font-semibold text-amber-200">{scheduledDowngradePriceText || '-'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-amber-200/50">Effective</span>
                                                    <span className="font-semibold text-amber-200">{scheduledDowngradeDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 space-y-3">
                                    <button
                                        onClick={onClickChangePlan}
                                        className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-sm"
                                    >
                                        Change Plan
                                    </button>
                                    {!subscriptionData?.cancelAtPeriodEnd && (
                                        <button
                                            onClick={onClickCancelSubscription}
                                            className="w-full py-2.5 px-4 rounded-lg border border-white/5 text-zinc-500 font-medium text-sm hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                                        >
                                            Cancel Subscription
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Upgrade CTA for Free Users */}
                        {!isPremiumPlan && (
                            <div className="p-8 rounded-2xl border border-white/5 bg-zinc-900/60 text-center">
                                <Sparkles size={32} className="text-zinc-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Upgrade Now</h3>
                                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                                    Create professional faceless shorts with no effort.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/#pricing'}
                                    className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-colors"
                                >
                                    View Pricing
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Payment History */}
                    {orderList.length > 0 && (
                        <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/40 lg:col-span-2">
                            <div className="flex items-center gap-2.5 mb-6">
                                <Receipt size={18} className="text-zinc-500" />
                                <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">Payment History</h3>
                            </div>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                {orderList.map((order, index) => (
                                    <OrderItem key={index} orderData={order} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showChangePlanModal && <ChangePlanModal
                userCurrentProductId={subscriptionData?.productId ?? null}
                userCurrentProductName={subscriptionData?.productName ?? null}
                onConfirmChangePlan={onConfirmChangePlan}
                onClickClose={() => {
                    setShowChangePlanModal(false);
                }}
            />}
            {showCancelSubscriptionModal && <DefaultModal
                title="Cancel Subscription"
                message="Are you sure you want to cancel your subscription? Your plan will remain active until the end of the current billing period, and you will not be charged again."
                confirmText="Yes, Cancel"
                cancelText="No, Keep it"
                onClickConfirm={onConfirmCancelSubscription}
                onClickCancel={() => setShowCancelSubscriptionModal(false)}
            />}
            {showDisconnectModal && <DefaultModal
                title="Disconnect Account"
                message={`Are you sure you want to disconnect this ${isDeletingPlatform === 'youtube' ? 'YouTube channel' : 'TikTok account'}? Any active Autopilot series using this account will stop exporting.`}
                confirmText={isDisconnecting ? "Disconnecting..." : "Yes, Disconnect"}
                cancelText="No, Keep it"
                onClickConfirm={onConfirmDisconnect}
                onClickCancel={() => {
                    if (!isDisconnecting) {
                        setShowDisconnectModal(false);
                        setIsDeletingTokenId(null);
                        setIsDeletingPlatform(null);
                    }
                }}
            />}

            {/* Loading Overlay - Minimal Version */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                        <p className="text-sm font-medium text-zinc-400">Loading Profile...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(ProfilePageClient);