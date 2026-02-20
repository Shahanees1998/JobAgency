"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import ChartWrapper from "@/components/ChartWrapper";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { useRouter } from "next/navigation";
import { Toast } from "primereact/toast";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection, getDefaultRedirectPath } from "@/lib/rolePermissions";
import { useLanguage } from "@/context/LanguageContext";

interface DashboardStats {
  totalEmployers: number;
  totalCandidates: number;
  totalJobs: number;
  totalApplications: number;
  pendingEmployerApprovals: number;
  pendingJobModerations: number;
  supportRequests: number;
}

interface RecentActivity {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
    status?: string;
    startDate?: string;
}

interface GrowthData {
  labels: string[];
  newEmployers: number[];
  newCandidates: number[];
  newJobs: number[];
  newApplications: number[];
}

export default function AdminDashboard() {
    const router = useRouter();
    const toast = useRef<Toast>(null);
    const { user, loading: authLoading, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [stats, setStats] = useState<DashboardStats>({
        totalEmployers: 0,
        totalCandidates: 0,
        totalJobs: 0,
        totalApplications: 0,
        pendingEmployerApprovals: 0,
        pendingJobModerations: 0,
        supportRequests: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [growthData, setGrowthData] = useState<GrowthData>({
        labels: [],
        newEmployers: [],
        newCandidates: [],
        newJobs: [],
        newApplications: []
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const hasTriedRefreshRef = useRef(false);

    useEffect(() => {
        if (authLoading) return;

        // If user is missing, try one refresh before redirecting.
        // This avoids getting stuck in a "loading" state after client navigation.
        if (!user?.id) {
            if (!hasTriedRefreshRef.current) {
                hasTriedRefreshRef.current = true;
                // fire-and-forget; if refresh fails, the next render will redirect
                refreshUser().catch(() => {});
                return;
            }
            router.replace("/auth/login?callbackUrl=/admin");
            return;
        }

        // Redirect non-admin users to their allowed section
        if (!canAccessSection(user.role, "canAccessAll")) {
            router.replace(getDefaultRedirectPath(user.role));
            return;
        }

        // Always load dashboard data when page is active for an admin user
        loadDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user?.id, user?.role]);

    const isFetchingDashboardRef = useRef(false);
    const loadDashboardData = async () => {
        if (isFetchingDashboardRef.current) return;
        isFetchingDashboardRef.current = true;
        setLoading(true);
        try {
            const response = await apiClient.getDashboard();
            if (response.error) {
                throw new Error(response.error);
            }

            // apiClient wraps response, so check response.data first, then fallback to response
            const dashboardData = (response as any).data || response;
            if (dashboardData?.stats) {
                setStats(dashboardData.stats);
                setRecentActivity(dashboardData.recentActivity);
                setGrowthData(dashboardData.growthData);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            showToast("error", t("common.error"), t("dashboard.failedToLoadDashboard"));
            // Set fallback data structure
            setStats({
                totalEmployers: 0,
                totalCandidates: 0,
                totalJobs: 0,
                totalApplications: 0,
                pendingEmployerApprovals: 0,
                pendingJobModerations: 0,
                supportRequests: 0
            });
            setRecentActivity([]);
            setGrowthData({
                labels: [],
                newEmployers: [],
                newCandidates: [],
                newJobs: [],
                newApplications: []
            });
        } finally {
            setLoading(false);
            isFetchingDashboardRef.current = false;
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return `${diffInSeconds}s ago`;
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        }
    };

    const chartData = {
        labels: growthData.labels,
        datasets: [
            {
                label: t('dashboard.newEmployers'),
                data: growthData.newEmployers,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
            },
            {
                label: t('dashboard.newCandidates'),
                data: growthData.newCandidates,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
            },
            {
                label: t('dashboard.newJobs'),
                data: growthData.newJobs,
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                tension: 0.4,
            },
            {
                label: t('dashboard.newApplications'),
                data: growthData.newApplications,
                borderColor: '#9C27B0',
                backgroundColor: 'rgba(156, 39, 176, 0.1)',
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                beginAtZero: true,
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    const getActivityTypeSeverity = (type: string) => {
        switch (type) {
            case "EMPLOYER_REGISTRATION": return "success";
            case "CANDIDATE_REGISTRATION": return "info";
            case "JOB_POSTED": return "success";
            case "APPLICATION_SUBMITTED": return "info";
            case "SUPPORT_REQUEST": return "warning";
            default: return "info";
        }
    };

    const getActivityTypeLabel = (type: string) => {
        switch (type) {
            case "EMPLOYER_REGISTRATION": return t("dashboard.activityEmployer");
            case "CANDIDATE_REGISTRATION": return t("dashboard.activityCandidate");
            case "JOB_POSTED": return t("dashboard.activityJobPosted");
            case "APPLICATION_SUBMITTED": return t("dashboard.activityApplication");
            case "SUPPORT_REQUEST": return t("dashboard.activitySupport");
            default: return type;
        }
    };

    // Show loading state while checking auth
    if (authLoading) {
        return (
            <div className="flex align-items-center justify-content-center min-h-screen">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    // Show redirecting message if not authenticated or not admin (redirect will happen in useEffect)
    if (!user || !canAccessSection(user.role, 'canAccessAll')) {
        return (
            <div className="flex align-items-center justify-content-center min-h-screen">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>{t("auth.redirecting")}</p>
                </div>
            </div>
        );
    }

    const quickActionColors: Record<string, string> = { blue: "#2196F3", green: "#4CAF50", orange: "#FF9800", purple: "#9C27B0" };
    const quickActions = [
        {
            title: t("dashboard.manageEmployers"),
            description: t("dashboard.manageEmployersDesc"),
            icon: "pi pi-briefcase",
            route: "/admin/employers",
            color: "blue",
            canAccess: true,
        },
        {
            title: t("dashboard.manageCandidates"),
            description: t("dashboard.manageCandidatesDesc"),
            icon: "pi pi-users",
            route: "/admin/candidates",
            color: "green",
            canAccess: true,
        },
        {
            title: t("dashboard.jobListingsTitle"),
            description: t("dashboard.jobListingsDesc"),
            icon: "pi pi-list",
            route: "/admin/jobs",
            color: "orange",
            canAccess: true,
        },
        {
            title: t("dashboard.applicationsTitle"),
            description: t("dashboard.applicationsDesc"),
            icon: "pi pi-file",
            route: "/admin/applications",
            color: "purple",
            canAccess: true,
        },
    ];

    // Compute trend from growthData: compare current month vs previous month
    const getTrend = (arr: number[]) => {
        if (!arr?.length || arr.length < 2) return null;
        const current = arr[arr.length - 1] ?? 0;
        const prev = arr[arr.length - 2] ?? 0;
        if (prev === 0) return current > 0 ? { direction: "up" as const, percent: 100 } : null;
        const percent = Math.round(((current - prev) / prev) * 100);
        return { direction: percent >= 0 ? ("up" as const) : ("down" as const), percent: Math.abs(percent) };
    };

    const colorMap: Record<string, { bg: string; text: string }> = {
        blue: { bg: "#E3F2FD", text: "#1976D2" },
        orange: { bg: "#FFF3E0", text: "#E65100" },
        yellow: { bg: "#FFFDE7", text: "#F9A825" },
        red: { bg: "#FFEBEE", text: "#C62828" },
        purple: { bg: "#F3E5F5", text: "#7B1FA2" },
        gray: { bg: "#ECEFF1", text: "#546E7A" },
    };

    const cardData = [
        {
            value: stats.totalEmployers,
            label: t("dashboard.totalEmployers"),
            color: "blue",
            icon: "pi pi-building",
            route: "/admin/employers",
            canAccess: true,
            trend: getTrend(growthData.newEmployers),
        },
        {
            value: stats.totalCandidates,
            label: t("dashboard.totalCandidates"),
            color: "orange",
            icon: "pi pi-star",
            route: "/admin/candidates",
            canAccess: true,
            trend: getTrend(growthData.newCandidates),
        },
        {
            value: stats.totalJobs,
            label: t("dashboard.totalJobs"),
            color: "yellow",
            icon: "pi pi-clock",
            route: "/admin/jobs",
            canAccess: true,
            trend: getTrend(growthData.newJobs),
        },
        {
            value: stats.totalApplications,
            label: t("dashboard.totalApplications"),
            color: "red",
            icon: "pi pi-question-circle",
            route: "/admin/applications",
            canAccess: true,
            trend: getTrend(growthData.newApplications),
        },
        {
            value: stats.pendingEmployerApprovals,
            label: t("dashboard.pendingEmployerApprovals"),
            color: "gray",
            icon: "pi pi-clock",
            route: "/admin/employers/pending",
            canAccess: true,
            trend: null,
        },
        {
            value: stats.pendingJobModerations,
            label: t("dashboard.pendingJobModeration"),
            color: "blue",
            icon: "pi pi-star",
            route: "/admin/jobs/pending",
            canAccess: true,
            trend: null,
        },
        {
            value: stats.supportRequests,
            label: t("dashboard.supportRequests"),
            color: "purple",
            icon: "pi pi-question-circle",
            route: "/admin/support",
            canAccess: true,
            trend: null,
        },
    ];

    return (
        <div className="grid row-gap-2">
            {/* Header */}
            <div className="col-12">
                <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
                    <div>
                        <h1 className="text-3xl font-bold m-0">{t("dashboard.title")}</h1>
                        <p className="text-600 mt-2 mb-0">{t("dashboard.welcomeBack")}</p>
                        <p className="text-sm text-gray-500 mt-1 mb-0">
                            {new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })} • {new Date().toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                            {lastUpdated && (
                                <span className="ml-3">
                                    • {t("dashboard.lastUpdated")}: {lastUpdated.toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label={t("common.refresh")}
                            icon="pi pi-refresh"
                            onClick={loadDashboardData}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                // Loading skeleton for stats cards
                <>
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div key={index} className="col-12 md:col-6 xl:col-3">
                            <Card style={{ minHeight: "88px" }} className="border-round-lg dashboard-stat-card">
                                <div className="flex align-items-start gap-2">
                                    <div className="flex-shrink-0 border-round bg-gray-200 animate-pulse" style={{ width: "40px", height: "40px" }} />
                                    <div className="flex-1">
                                        <div className="text-xl font-bold text-gray-300 animate-pulse">--</div>
                                        <div className="text-600 animate-pulse text-sm">{t("common.loading")}</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </>
            ) : (
                <>
                    {cardData.map((card) => (
                        <div className="col-12 md:col-6 xl:col-3" key={card.label}>
                            <div className="relative">
                                {card.trend && (
                                    <div
                                        className="flex align-items-center gap-1 px-2 py-1 border-round text-xs font-medium absolute z-1"
                                        style={{
                                            top: "0.5rem",
                                            right: "0.5rem",
                                            backgroundColor: card.trend.direction === "up" ? "#dcfce7" : "#fee2e2",
                                            color: card.trend.direction === "up" ? "#16a34a" : "#dc2626",
                                        }}
                                    >
                                        <i className={`pi pi-arrow-${card.trend.direction}`}></i>
                                        <span>{card.trend.percent}%</span>
                                    </div>
                                )}
                                <Card
                                    style={{ minHeight: "88px" }}
                                    className="cursor-pointer hover:shadow-lg transition-shadow border-round-lg dashboard-stat-card"
                                    onClick={() => router.push(card.route)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyPress={e => { if (e.key === "Enter") router.push(card.route); }}
                                >
                                    <div className="flex align-items-start gap-2">
                                        <div
                                            className="flex-shrink-0 flex align-items-center justify-content-center border-round p-1"
                                            style={{ width: "40px", height: "40px", backgroundColor: colorMap[card.color]?.bg || "#ECEFF1" }}
                                        >
                                            <i className={`${card.icon} text-lg`} style={{ color: colorMap[card.color]?.text || "#546E7A" }}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xl font-bold text-900">{card.value}</div>
                                            <div className="text-600 text-sm">{card.label}</div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Quick Actions - single row */}
            <div className="col-12">
                <Card title={t("dashboard.quickActions")} className="mt-3">
                    <div className="flex flex-wrap md:flex-nowrap gap-2 overflow-x-auto">
                        {quickActions.map((action, index) => (
                            <div
                                key={index}
                                className="flex-1 min-w-[200px] md:min-w-0"
                            >
                                <Card style={{ minHeight: "80px" }} className="cursor-pointer hover:shadow-lg transition-shadow h-full dashboard-stat-card" onClick={() => router.push(action.route)}>
                                    <div className="flex align-items-center gap-3">
                                        <i className={`${action.icon} text-2xl`} style={{ color: quickActionColors[action.color] || "#64748b" }}></i>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold m-0 truncate">{action.title}</h3>
                                            <p className="text-600 text-sm m-0">{action.description}</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Chart - full width */}
            <div className="col-12">
                <Card title={t("dashboard.platformGrowth")} className="mt-4">
                    {loading ? (
                        <div className="flex align-items-center justify-content-center" style={{ minHeight: '350px' }}>
                            <div className="text-600">{t("dashboard.loadingChart")}</div>
                        </div>
                    ) : growthData.newEmployers.every(val => val === 0) && growthData.newCandidates.every(val => val === 0) ? (
                        <div className="flex align-items-center justify-content-center flex-column" style={{ minHeight: '350px' }}>
                            <i className="pi pi-chart-line text-4xl text-gray-400 mb-3"></i>
                            <div className="text-600 text-center">{t("dashboard.noGrowthData")}</div>
                            <div className="text-sm text-gray-500 text-center">{t("dashboard.growthDataHint")}</div>
                        </div>
                    ) : (
                        <div style={{ minHeight: '350px' }}>
                            <ChartWrapper type="line" data={chartData} options={chartOptions} style={{ height: '350px' }} />
                        </div>
                    )}
                </Card>
            </div>

            {/* Recent Activity - full width below chart */}
            <div className="col-12">
                <Card title={t("dashboard.recentActivity")} className="mt-4">
                    {loading ? (
                        <div className="flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
                            <div className="text-600">{t("dashboard.loadingActivity")}</div>
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="flex align-items-center justify-content-center flex-column" style={{ minHeight: '200px' }}>
                            <i className="pi pi-info-circle text-4xl text-gray-400 mb-3"></i>
                            <div className="text-600 text-center">{t("dashboard.noRecentActivity")}</div>
                            <div className="text-sm text-gray-500 text-center">{t("dashboard.activityHint")}</div>
                        </div>
                    ) : (
                        <div className="overflow-auto">
                        <DataTable value={recentActivity} showGridlines>
                            <Column 
                                field="type" 
                                header={t("common.type")} 
                                body={(rowData) => (
                                    <Tag 
                                        value={getActivityTypeLabel(rowData.type)} 
                                        severity={getActivityTypeSeverity(rowData.type)} 
                                    />
                                )}
                            />
                            <Column 
                                field="description" 
                                header={t("common.description")} 
                                body={(rowData) => (
                                    <div className="text-sm">
                                        <div className="font-semibold">{rowData.description}</div>
                                        <div className="text-600">{rowData.user}</div>
                                    </div>
                                )}
                            />
                            <Column 
                                field="timestamp" 
                                header={t("common.time")} 
                                body={(rowData) => (
                                    <div className="text-xs text-600">
                                        {formatRelativeTime(rowData.timestamp)}
                                    </div>
                                )}
                            />
                        </DataTable>
                        </div>
                    )}
                </Card>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 