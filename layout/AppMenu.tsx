import type { MenuModel } from "@/types/index";
import AppSubMenu from "./AppSubMenu";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";
import { useLanguage } from "@/context/LanguageContext";

const AppMenu = () => {
    const { user } = useAuth();
    const { t } = useLanguage();

    if (!user) {
        return null;
    }

    const model: MenuModel[] = [
        {
            label: t("menu.dashboard"),
            icon: "pi pi-home",
            items: [
                { label: t("menu.overview"), icon: "pi pi-fw pi-home", to: "/admin" },
            ],
        },
        {
            label: t("menu.employerManagement"),
            icon: "pi pi-briefcase",
            items: [
                { label: t("menu.allEmployers"), icon: "pi pi-fw pi-briefcase", to: "/admin/employers" },
                { label: t("menu.pendingApprovals"), icon: "pi pi-fw pi-clock", to: "/admin/employers/pending" },
            ],
        },
        {
            label: t("menu.candidateManagement"),
            icon: "pi pi-users",
            items: [
                { label: t("menu.allCandidates"), icon: "pi pi-fw pi-users", to: "/admin/candidates" },
            ],
        },
        {
            label: t("menu.jobListings"),
            icon: "pi pi-list",
            items: [
                { label: t("menu.allJobs"), icon: "pi pi-fw pi-list", to: "/admin/jobs" },
                { label: t("menu.pendingModeration"), icon: "pi pi-fw pi-clock", to: "/admin/jobs/pending" },
            ],
        },
        {
            label: t("menu.applications"),
            icon: "pi pi-file",
            items: [
                { label: t("menu.allApplications"), icon: "pi pi-fw pi-file", to: "/admin/applications" },
            ],
        },
        {
            label: t("menu.chatModeration"),
            icon: "pi pi-comments",
            items: [
                { label: t("menu.allChats"), icon: "pi pi-fw pi-comments", to: "/admin/chats" },
            ],
        },
        {
            label: t("menu.support"),
            icon: "pi pi-shield",
            items: [
                { label: t("menu.supportTickets"), icon: "pi pi-fw pi-question-circle", to: "/admin/support" },
                { label: t("menu.notifications"), icon: "pi pi-fw pi-bell", to: "/admin/notifications" },
            ],
        },
        {
            label: t("menu.system"),
            icon: "pi pi-cog",
            items: [
                { label: t("menu.settings"), icon: "pi pi-fw pi-cog", to: "/admin/settings" },
                { label: t("menu.announcements"), icon: "pi pi-fw pi-megaphone", to: "/admin/announcements" },
            ],
        },
        {
            label: t("menu.profile"),
            icon: "pi pi-user",
            items: [
                { label: t("menu.personalInfo"), icon: "pi pi-fw pi-user", to: "/admin/profile/user" },
                { label: t("menu.changePassword"), icon: "pi pi-fw pi-key", to: "/admin/profile/password" },
                { label: t("menu.accountSettings"), icon: "pi pi-fw pi-cog", to: "/admin/profile/settings" },
            ],
        },
    ];

    return <AppSubMenu model={model} />;
};

export default AppMenu;

