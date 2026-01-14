"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Divider } from "primereact/divider";
import { Skeleton } from "primereact/skeleton";
import { apiClient } from "@/lib/apiClient";
import { Dialog } from "primereact/dialog";
import { useAuth } from "@/hooks/useAuth";
import { Tag } from "primereact/tag";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import { getProfileImageUrl } from "@/lib/cloudinary-client";

interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    profileImage?: string;
    profileImagePublicId?: string;
    membershipNumber?: string;
    joinDate?: string;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);

    const [profileForm, setProfileForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        membershipNumber: "",
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const toast = useRef<Toast>(null);

    useEffect(() => {
        if (user?.id) {
            loadProfile();
        }
    }, [user?.id]);

    const loadProfile = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const response = await apiClient.getUser(user.id);

            if (response.error) {
                throw new Error(response.error);
            }

            const userProfile = response.data as UserProfile;
            if (userProfile) {
                setProfile(userProfile);
                setProfileForm({
                    firstName: userProfile.firstName || "",
                    lastName: userProfile.lastName || "",
                    email: userProfile.email || "",
                    phone: userProfile.phone || "",
                    membershipNumber: userProfile.membershipNumber || "",
                });
            }
        } catch (error) {
            showToast("error", "Error", "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const saveProfile = async () => {
        if (!profile || !user?.id) return;

        setSaving(true);
        try {
            const response = await apiClient.updateUser(profile.id, {
                firstName: profileForm.firstName,
                lastName: profileForm.lastName,
                email: profileForm.email,
                phone: profileForm.phone,
                membershipNumber: profileForm.membershipNumber,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update local state
            setProfile(prev => prev ? { ...prev, ...profileForm } as UserProfile : null);

            // Refresh user data
            await refreshUser();

            showToast("success", "Success", "Profile updated successfully");
        } catch (error) {
            showToast("error", "Error", "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const changePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast("error", "Error", "New passwords do not match");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            showToast("error", "Error", "Password must be at least 6 characters long");
            return;
        }

        setChangingPassword(true);
        try {
            if (!user?.id) {
                throw new Error('User not found');
            }
            const response = await apiClient.changePassword(
                passwordForm.currentPassword,
                passwordForm.newPassword
            );

            if (response.error) {
                throw new Error(response.error);
            }

            showToast("success", "Success", "Password changed successfully");
            setShowPasswordDialog(false);
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (error) {
            showToast("error", "Error", "Failed to change password. Please check your current password.");
        } finally {
            setChangingPassword(false);
        }
    };



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const getUserInitials = () => {
        if (profile?.firstName && profile?.lastName) {
            return `${profile.firstName[0]}${profile.lastName[0]}`;
        }
        return 'U';
    };

    const ProfileSkeleton = () => (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column gap-4">
                        {/* Header Skeleton */}
                        <div className="flex align-items-center gap-3">
                            <Skeleton shape="circle" size="4rem" />
                            <div>
                                <Skeleton height="2rem" width="200px" className="mb-2" />
                                <Skeleton height="1rem" width="300px" />
                            </div>
                        </div>

                        <Divider />

                        {/* Main Content Skeleton */}
                        <div className="grid">
                            <div className="col-12 lg:col-8">
                                <Skeleton height="1.5rem" width="150px" className="mb-3" />

                                <div className="grid">
                                    <div className="col-12 md:col-6">
                                        <Skeleton height="1rem" className="mb-2" />
                                        <Skeleton height="3rem" />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <Skeleton height="1rem" className="mb-2" />
                                        <Skeleton height="3rem" />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <Skeleton height="1rem" className="mb-2" />
                                        <Skeleton height="3rem" />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <Skeleton height="1rem" className="mb-2" />
                                        <Skeleton height="3rem" />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <Skeleton height="1rem" className="mb-2" />
                                        <Skeleton height="3rem" />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Skeleton height="3rem" width="120px" />
                                    <Skeleton height="3rem" width="140px" />
                                </div>
                            </div>

                            <div className="col-12 lg:col-4">
                                <Skeleton height="1.5rem" width="150px" className="mb-3" />

                                <div className="flex flex-column gap-3">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="p-3 surface-100 border-round">
                                            <Skeleton height="1rem" className="mb-2" />
                                            <Skeleton height="1.5rem" width="60%" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    if (loading) {
        return <ProfileSkeleton />;
    }

    if (!profile) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <div className="text-center p-4">
                            <i className="pi pi-user text-4xl text-400 mb-3"></i>
                            <h3 className="text-xl font-semibold mb-2">Profile Not Found</h3>
                            <p className="text-600">Unable to load your profile information.</p>
                            <Button
                                label="Retry"
                                icon="pi pi-refresh"
                                onClick={loadProfile}
                                className="mt-3"
                            />
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex flex-column gap-4">
                        {/* Header */}
                        <div className="flex align-items-center gap-4">
                            <div className="flex flex-column align-items-center gap-2">
                                <ProfileImageUpload
                                    currentImageUrl={profile?.profileImage}
                                    currentImagePublicId={profile?.profileImagePublicId}
                                    userId={profile?.id || ''}
                                    onImageUploaded={async (imageUrl, publicId) => {
                                        // Update local state
                                        setProfile(prev => prev ? {
                                            ...prev,
                                            profileImage: imageUrl,
                                            profileImagePublicId: publicId || prev.profileImagePublicId
                                        } : null);

                                        // Refresh user data
                                        await refreshUser();

                                        // Dispatch custom event to notify other components
                                        window.dispatchEvent(new Event('profile-updated'));
                                    }}
                                    size="large"
                                />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold m-0">Profile Settings</h2>
                                <p className="text-600 m-0">Manage your account information and preferences</p>
                            </div>
                        </div>

                        <Divider />

                        {/* Profile Information */}
                        <div className="grid">
                            <div className="col-12 lg:col-8">
                                <h3 className="text-xl font-semibold mb-3">Personal Information</h3>

                                <div className="grid">
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">First Name *</label>
                                        <InputText
                                            value={profileForm.firstName}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                                            placeholder="Enter first name"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Last Name *</label>
                                        <InputText
                                            value={profileForm.lastName}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                                            placeholder="Enter last name"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Email *</label>
                                        <InputText
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Enter email"
                                            className="w-full"
                                            type="email"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Phone</label>
                                        <InputText
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="Enter phone number"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6">
                                        <label className="block text-sm font-medium mb-2">Membership Number</label>
                                        <InputText
                                            value={profileForm.membershipNumber}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, membershipNumber: e.target.value }))}
                                            placeholder="Enter membership number"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button
                                        label="Save Changes"
                                        icon="pi pi-check"
                                        onClick={saveProfile}
                                        loading={saving}
                                        severity="success"
                                        disabled={!profileForm.firstName || !profileForm.lastName || !profileForm.email}
                                    />
                                    <Button
                                        label="Change Password"
                                        icon="pi pi-key"
                                        onClick={() => setShowPasswordDialog(true)}
                                        severity="secondary"
                                    />
                                </div>
                            </div>

                            <div className="col-12 lg:col-4">
                                <h3 className="text-xl font-semibold mb-3">Account Information</h3>

                                <div className="flex flex-column gap-3">
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Role</div>
                                        <div className="flex align-items-center gap-2">
                                            <Tag
                                                value={profile?.role}
                                                severity={profile?.role === 'ADMIN' ? 'danger' : 'info'}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Status</div>
                                        <div className="flex align-items-center gap-2">
                                            <Tag
                                                value={profile?.status}
                                                severity={
                                                    profile?.status === 'ACTIVE' ? 'success' :
                                                        profile?.status === 'PENDING' ? 'warning' :
                                                            profile?.status === 'SUSPENDED' ? 'danger' : 'secondary'
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Member Since</div>
                                        <div className="font-semibold">
                                            {profile?.joinDate ? formatDate(profile.joinDate) : 'Not set'}
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Last Login</div>
                                        <div className="font-semibold">
                                            {profile?.lastLogin ? formatRelativeTime(profile.lastLogin) : 'Never'}
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Account Created</div>
                                        <div className="font-semibold">
                                            {profile?.createdAt ? formatDate(profile.createdAt) : 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="p-3 surface-100 border-round">
                                        <div className="text-sm text-600">Last Updated</div>
                                        <div className="font-semibold">
                                            {profile?.updatedAt ? formatRelativeTime(profile.updatedAt) : 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Password Change Dialog */}
            <div className="col-12">
                <Dialog
                    visible={showPasswordDialog}
                    style={{ width: "500px" }}
                    header="Change Password"
                    modal
                    onHide={() => setShowPasswordDialog(false)}
                    footer={
                        <div className="flex gap-2 justify-content-end">
                            <Button
                                label="Cancel"
                                icon="pi pi-times"
                                onClick={() => setShowPasswordDialog(false)}
                                text
                            />
                            <Button
                                label="Change Password"
                                icon="pi pi-check"
                                onClick={changePassword}
                                loading={changingPassword}
                                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                            />
                        </div>
                    }
                >
                    <div className="flex flex-column gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-2">Current Password *</label>
                            <div style={{ position: "relative" }} className="w-full">
                                <InputText
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    placeholder="Enter current password"
                                    className="w-full"
                                    type={showCurrent ? "text" : "password"}
                                    style={{ paddingRight: "2.5rem" }}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowCurrent((v) => !v)}
                                    style={{
                                        position: "absolute",
                                        right: "0.75rem",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        zIndex: 2,
                                    }}
                                    aria-label={showCurrent ? "Hide password" : "Show password"}
                                >
                                    <i className={`pi ${showCurrent ? "pi-eye-slash" : "pi-eye"}`}></i>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">New Password *</label>
                            <div style={{ position: "relative" }} className="w-full">
                                <InputText
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="Enter new password"
                                    className="w-full"
                                    type={showNew ? "text" : "password"}
                                    style={{ paddingRight: "2.5rem" }}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowNew((v) => !v)}
                                    style={{
                                        position: "absolute",
                                        right: "0.75rem",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        zIndex: 2,
                                    }}
                                    aria-label={showNew ? "Hide password" : "Show password"}
                                >
                                    <i className={`pi ${showNew ? "pi-eye-slash" : "pi-eye"}`}></i>
                                </button>
                            </div>
                            <small className="text-600">Password must be at least 6 characters long</small>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm New Password *</label>
                            <div style={{ position: "relative" }} className="w-full">
                                <InputText
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="Confirm new password"
                                    className="w-full"
                                    type={showConfirm ? "text" : "password"}
                                    style={{ paddingRight: "2.5rem" }}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowConfirm((v) => !v)}
                                    style={{
                                        position: "absolute",
                                        right: "0.75rem",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        zIndex: 2,
                                    }}
                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                >
                                    <i className={`pi ${showConfirm ? "pi-eye-slash" : "pi-eye"}`}></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </div>

            <Toast ref={toast} />
        </div>
    );
} 