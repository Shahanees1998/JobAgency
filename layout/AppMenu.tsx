import type { MenuModel } from "@/types/index";
import AppSubMenu from "./AppSubMenu";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";

const AppMenu = () => {
    const { user } = useAuth();
    
    if (!user) {
        return null;
    }
    
    const model: MenuModel[] = [
        // Dashboard
        {
            label: "Dashboard",
            icon: "pi pi-home",
            items: [
                {
                    label: "Overview",
                    icon: "pi pi-fw pi-home",
                    to: "/admin",
                },
   
            ],
        },
        
        // Employer Management
        {
            label: "Employer Management",
            icon: "pi pi-briefcase",
            items: [
                {
                    label: "All Employers",
                    icon: "pi pi-fw pi-briefcase",
                    to: "/admin/employers",
                },
                {
                    label: "Pending Approvals",
                    icon: "pi pi-fw pi-clock",
                    to: "/admin/employers/pending",
                },
            ],
        },
        
        // Candidate Management
        {
            label: "Candidate Management",
            icon: "pi pi-users",
            items: [
                {
                    label: "All Candidates",
                    icon: "pi pi-fw pi-users",
                    to: "/admin/candidates",
                },
            ],
        },
        
        // Job Listings Management
        {
            label: "Job Listings",
            icon: "pi pi-list",
            items: [
                {
                    label: "All Jobs",
                    icon: "pi pi-fw pi-list",
                    to: "/admin/jobs",
                },
                {
                    label: "Pending Moderation",
                    icon: "pi pi-fw pi-clock",
                    to: "/admin/jobs/pending",
                },
            ],
        },
        
        // Applications Management
        {
            label: "Applications",
            icon: "pi pi-file",
            items: [
                {
                    label: "All Applications",
                    icon: "pi pi-fw pi-file",
                    to: "/admin/applications",
                },
            ],
        },
        
        // Analytics & Reports
        {
            label: "Analytics",
            icon: "pi pi-chart-bar",
            items: [
                {
                    label: "System Overview",
                    icon: "pi pi-fw pi-chart-line",
                    to: "/admin/analytics",
                },
            ],
        },
        
        // Chat Moderation
        {
            label: "Chat Moderation",
            icon: "pi pi-comments",
            items: [
                {
                    label: "All Chats",
                    icon: "pi pi-fw pi-comments",
                    to: "/admin/chats",
                },
            ],
        },
        
        // Support & Escalations
        {
            label: "Support",
            icon: "pi pi-shield",
            items: [
                {
                    label: "Escalations",
                    icon: "pi pi-fw pi-exclamation-triangle",
                    to: "/admin/escalations",
                },
                {
                    label: "Support Tickets",
                    icon: "pi pi-fw pi-question-circle",
                    to: "/admin/support",
                },
                {
                    label: "Notifications",
                    icon: "pi pi-fw pi-bell",
                    to: "/admin/notifications",
                },
            ],
        },
        
        // System Management
        {
            label: "System",
            icon: "pi pi-cog",
            items: [
                {
                    label: "Settings",
                    icon: "pi pi-fw pi-cog",
                    to: "/admin/settings",
                },
                {
                    label: "Integrations",
                    icon: "pi pi-fw pi-plug",
                    to: "/admin/integrations",
                },
                {
                    label: "Announcements",
                    icon: "pi pi-fw pi-megaphone",
                    to: "/admin/announcements",
                },
            ],
        },
        
        // Profile
        {
            label: "Profile",
            icon: "pi pi-user",
            items: [
                {
                    label: "Personal Info",
                    icon: "pi pi-fw pi-user",
                    to: "/admin/profile/user",
                },
                {
                    label: "Change Password",
                    icon: "pi pi-fw pi-key",
                    to: "/admin/profile/password",
                },
                {
                    label: "Account Settings",
                    icon: "pi pi-fw pi-cog",
                    to: "/admin/profile/settings",
                },
            ],
        },
    ];

    return <AppSubMenu model={model} />;
};

export default AppMenu;

