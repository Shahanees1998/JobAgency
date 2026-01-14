import Link from "next/link";
import { useContext } from "react";
import AppMenu from "./AppMenu";
import { LayoutContext } from "./context/layoutcontext";
import { MenuProvider } from "./context/menucontext";
import { LayoutState } from "../types/layout";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

const AppSidebar = () => {
    const { setLayoutState } = useContext(LayoutContext);
    const { user } = useAuth();
    
    const anchor = () => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            anchored: !prevLayoutState.anchored,
        }));
    };

    const dashboardPath = "/admin";
    const title = "Admin";

    return (
        <>
            <div className="sidebar-header">
                <Link style={{display:'flex', alignItems: 'center', color: '#ffffff' }} href={dashboardPath} className="app-logo flex items-center justify-content-center gap-3">
                    <img src="/images/logo.png" alt="JobPortal Logo"  style={{height:'60px', filter: 'brightness(0) invert(1)'}}/>
                </Link>
                <button
                    className="layout-sidebar-anchor p-link z-2 mb-2"
                    type="button"
                    onClick={anchor}
                    style={{ color: '#ffffff' }}
                ></button>
            </div>

            <div className="layout-menu-container">
                <MenuProvider>
                    <AppMenu />
                </MenuProvider>
            </div>
        </>
    );
};

export default AppSidebar;
