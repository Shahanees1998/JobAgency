import { Badge } from "primereact/badge";
import { Sidebar } from "primereact/sidebar";
import { useContext, useState, useEffect } from "react";
import { LayoutContext } from "./context/layoutcontext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    sender: {
        id: string;
        firstName: string;
        lastName: string;
        profileImage?: string;
    };
}

const AppProfileSidebar = () => {
    const { layoutState, setLayoutState } = useContext(LayoutContext);
    const { user, logout } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    const onProfileSidebarHide = () => {
        setLayoutState((prevState) => ({
            ...prevState,
            profileSidebarVisible: false,
        }));
    };

    useEffect(() => {
        if (layoutState.profileSidebarVisible && user?.id) {
            loadSidebarData();
        }
    }, [layoutState.profileSidebarVisible, user?.id]);

    const loadSidebarData = async () => {
        setLoading(true);
        try {
            // Load recent notifications
            const notificationsResponse = await apiClient.getNotifications({
                page: 1,
                limit: 3,
                status: 'unread'
            });

            // Chat functionality removed - not relevant to hotel management system
            setMessages([]);

            if (!notificationsResponse.error) {
                setNotifications(((notificationsResponse.data as { data?: Notification[] })?.data ?? []) as Notification[]);
            }
        } catch (error) {
            console.error('Error loading sidebar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await logout();
        router.push('/auth/login');
    };

    const handleProfileClick = () => {
        router.push('/admin/profile');
        onProfileSidebarHide();
    };

    const handleSettingsClick = () => {
        router.push('/admin/settings');
        onProfileSidebarHide();
    };

    const handleNotificationClick = (notificationId: string) => {
        // Mark as read and navigate to notifications page
        apiClient.markNotificationAsRead(notificationId);
        router.push('/admin/communications/notifications');
        onProfileSidebarHide();
    };

    const handleMessageClick = () => {
        router.push('/admin/communications/chat');
        onProfileSidebarHide();
    };

    const formatRelativeTime = (dateString: string) => {
        const d = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (dateOnly.getTime() === today.getTime()) return `Today, ${timeStr}`;
        if (dateOnly.getTime() === yesterday.getTime()) return `Yesterday, ${timeStr}`;
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}, ${timeStr}`;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'EVENT_UPDATE': return 'pi-calendar';
            case 'DOCUMENT_UPLOAD': return 'pi-file';
            case 'CHAT_MESSAGE': return 'pi-comments';
            case 'BROADCAST': return 'pi-bell';
            case 'SUPPORT_RESPONSE': return 'pi-question-circle';
            default: return 'pi-bell';
        }
    };

    return (
        <Sidebar
            visible={layoutState.profileSidebarVisible}
            onHide={onProfileSidebarHide}
            position="right"
            className="layout-profile-sidebar w-full sm:w-25rem"
        >
            <div className="flex flex-column mx-auto md:mx-0">
                <span className="mb-2 font-semibold">{t("profileSidebar.welcome")}</span>
                <span className="text-color-secondary font-medium mb-5">
                    {user ? `${user.firstName} ${user.lastName}` : t("profileSidebar.adminUser")}
                </span>

                <ul className="list-none m-0 p-0">
                    <li>
                        <button 
                            onClick={handleProfileClick}
                            className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150 w-full text-left"
                        >
                            <span>
                                <i className="pi pi-user text-xl text-primary"></i>
                            </span>
                            <div className="ml-3">
                                <span className="mb-2 font-semibold">
                                    {t("profileSidebar.profile")}
                                </span>
                                <p className="text-color-secondary m-0">
                                    {t("profileSidebar.manageAccountSettings")}
                                </p>
                            </div>
                        </button>
                    </li>
                    {/* <li>
                        <button 
                            onClick={handleSettingsClick}
                            className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150 w-full text-left"
                        >
                            <span>
                                <i className="pi pi-cog text-xl text-primary"></i>
                            </span>
                            <div className="ml-3">
                                <span className="mb-2 font-semibold">
                                    {t("profileSidebar.settings")}
                                </span>
                                <p className="text-color-secondary m-0">
                                    {t("profileSidebar.configurePreferences")}
                                </p>
                            </div>
                        </button>
                    </li> */}
                    <li>
                        <button 
                            onClick={handleSignOut}
                            className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150 w-full text-left"
                        >
                            <span>
                                <i className="pi pi-power-off text-xl text-primary"></i>
                            </span>
                            <div className="ml-3">
                                <span className="mb-2 font-semibold">
                                    {t("profileSidebar.signOut")}
                                </span>
                                <p className="text-color-secondary m-0">
                                    {t("profileSidebar.logoutFromAccount")}
                                </p>
                            </div>
                        </button>
                    </li>
                </ul>
            </div>

            <div className="flex flex-column mt-5 mx-auto md:mx-0">
                <span className="mb-2 font-semibold">{t("profileSidebar.recentNotifications")}</span>
                <span className="text-color-secondary font-medium mb-5">
                    {loading ? (
                        <Skeleton width="60%" height="1rem" />
                    ) : (
                        t("profileSidebar.unreadCount").replace("{count}", String(notifications.length))
                    )}
                </span>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex align-items-center p-3 border-1 surface-border border-round">
                                <Skeleton shape="circle" size="2rem" className="mr-3" />
                                <div className="flex-1">
                                    <Skeleton width="80%" height="1rem" className="mb-2" />
                                    <Skeleton width="60%" height="0.8rem" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length > 0 ? (
                    <ul className="list-none m-0 p-0">
                        {notifications.slice(0, 3).map((notification) => (
                            <li key={notification.id}>
                                <button 
                                    onClick={() => handleNotificationClick(notification.id)}
                                    className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150 w-full text-left"
                                >
                                    <span>
                                        <i className={`pi ${getNotificationIcon(notification.type)} text-xl text-primary`}></i>
                                    </span>
                                    <div className="ml-3 flex-1">
                                        <span className="mb-2 font-semibold block text-left">
                                            {notification.title}
                                        </span>
                                        <p className="text-color-secondary m-0 text-left">
                                            {formatRelativeTime(notification.createdAt)}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center p-3 text-color-secondary">
                        <i className="pi pi-bell text-2xl mb-2"></i>
                        <p className="m-0">{t("profileSidebar.noNewNotifications")}</p>
                    </div>
                )}
            </div>

            <div className="flex flex-column mt-5 mx-auto md:mx-0">
                <span className="mb-2 font-semibold">{t("profileSidebar.recentMessages")}</span>
                <span className="text-color-secondary font-medium mb-5">
                    {loading ? (
                        <Skeleton width="50%" height="1rem" />
                    ) : (
                        t("profileSidebar.latestChatActivity")
                    )}
                </span>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex align-items-center p-3 border-1 surface-border border-round">
                                <Skeleton shape="circle" size="2rem" className="mr-3" />
                                <div className="flex-1">
                                    <Skeleton width="70%" height="1rem" className="mb-2" />
                                    <Skeleton width="50%" height="0.8rem" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length > 0 ? (
                    <ul className="list-none m-0 p-0">
                        {messages.slice(0, 3).map((message) => (
                            <li key={message.id}>
                                <button 
                                    onClick={handleMessageClick}
                                    className="cursor-pointer flex surface-border mb-3 p-3 align-items-center border-1 surface-border border-round hover:surface-hover transition-colors transition-duration-150 w-full text-left"
                                >
                                    <span>
                                        {message.sender.profileImage ? (
                                            <img
                                                src={message.sender.profileImage}
                                                alt="Avatar"
                                                className="w-2rem h-2rem border-circle"
                                            />
                                        ) : (
                                            <Avatar 
                                                label={`${message.sender.firstName[0]}${message.sender.lastName[0]}`}
                                                size="normal"
                                                className="bg-primary"
                                            />
                                        )}
                                    </span>
                                    <div className="ml-3 flex-1">
                                        <span className="mb-2 font-semibold block text-left">
                                            {`${message.sender.firstName} ${message.sender.lastName}`}
                                        </span>
                                        <p className="text-color-secondary m-0 text-left">
                                            {formatRelativeTime(message.createdAt)}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center p-3 text-color-secondary">
                        <i className="pi pi-comments text-2xl mb-2"></i>
                        <p className="m-0">{t("profileSidebar.noRecentMessages")}</p>
                    </div>
                )}
            </div>
        </Sidebar>
    );
};

export default AppProfileSidebar;
