"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";
import { useLanguage } from "@/context/LanguageContext";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string;
}

export default function AdminProfileUser() {
  const toast = useRef<Toast>(null);
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    status: '',
    createdAt: '',
    lastLogin: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && canAccessSection(user.role, 'canAccessAll')) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from an API
      setUserData({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || '',
        status: user?.status || '',
        createdAt: user?.createdAt || '',
        lastLogin: user?.lastLogin || '',
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      showToast("error", t("common.error"), t("profile.failedToLoadUser"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast("success", t("common.success"), t("profile.profileUpdated"));
    } catch (error) {
      console.error("Error saving user data:", error);
      showToast("error", t("common.error"), t("profile.failedToSaveProfile"));
    } finally {
      setSaving(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

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

  if (!user || !canAccessSection(user.role, 'canAccessAll')) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <div className="text-center">
          <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
          <h2>{t("auth.accessDenied")}</h2>
          <p>{t("access.message")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">{t("menu.personalInfo")}</h1>
            <p className="text-600 mt-2 mb-0">{t("profile.accountInformation")}</p>
          </div>
        </div>
      </div>

      <div className="col-12 lg:col-8 flex">
        <Card title={t("profile.profileDetails")} className="mb-4 flex-1 h-full">
          <div className="grid">
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.firstName")} *</label>
              <InputText
                value={userData.firstName}
                onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                placeholder={t("profile.enterFirstName")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.lastName")} *</label>
              <InputText
                value={userData.lastName}
                onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                placeholder={t("profile.enterLastName")}
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("common.email")} *</label>
              <InputText
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                placeholder={t("profile.enterEmail")}
                type="email"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.phone")}</label>
              <InputText
                value={userData.phone}
                onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                placeholder={t("profile.enterPhone")}
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-4 flex">
        <Card title={t("profile.accountInformation")} className="mb-4 flex-1 h-full">
          <div className="flex flex-column gap-3">
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">{t("common.status")}</div>
                <div className="text-600">{userData.role}</div>
              </div>
              <i className="pi pi-user text-2xl text-blue-500"></i>
            </div>
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">{t("common.status")}</div>
                <div className="text-600">{userData.status}</div>
              </div>
              <i className="pi pi-check-circle text-2xl text-green-500"></i>
            </div>
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">Member Since</div>
                <div className="text-600">{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : t("common.never")}</div>
              </div>
              <i className="pi pi-calendar text-2xl text-purple-500"></i>
            </div>
            <div className="flex justify-content-between align-items-center p-3 border-1 border-200 border-round">
              <div>
                <div className="font-semibold">{t("profile.lastLogin")}</div>
                <div className="text-600">{userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : t("common.never")}</div>
              </div>
              <i className="pi pi-clock text-2xl text-orange-500"></i>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12">
        <div className="flex justify-content-end gap-3">
          <Button
            label={t("common.cancel")}
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => loadUserData()}
          />
          <Button
            label={t("profile.saveChanges")}
            icon="pi pi-save"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          />
        </div>
      </div>

      <Toast ref={toast} />
    </div>
  );
}
