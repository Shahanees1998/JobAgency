"use client";

import { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";
import { useLanguage } from "@/context/LanguageContext";

interface SettingsData {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  theme: string;
}

const timezones = [
  { label: "UTC-12:00", value: "UTC-12" },
  { label: "UTC-11:00", value: "UTC-11" },
  { label: "UTC-10:00", value: "UTC-10" },
  { label: "UTC-09:00", value: "UTC-9" },
  { label: "UTC-08:00", value: "UTC-8" },
  { label: "UTC-07:00", value: "UTC-7" },
  { label: "UTC-06:00", value: "UTC-6" },
  { label: "UTC-05:00", value: "UTC-5" },
  { label: "UTC-04:00", value: "UTC-4" },
  { label: "UTC-03:00", value: "UTC-3" },
  { label: "UTC-02:00", value: "UTC-2" },
  { label: "UTC-01:00", value: "UTC-1" },
  { label: "UTC+00:00", value: "UTC+0" },
  { label: "UTC+01:00", value: "UTC+1" },
  { label: "UTC+02:00", value: "UTC+2" },
  { label: "UTC+03:00", value: "UTC+3" },
  { label: "UTC+04:00", value: "UTC+4" },
  { label: "UTC+05:00", value: "UTC+5" },
  { label: "UTC+06:00", value: "UTC+6" },
  { label: "UTC+07:00", value: "UTC+7" },
  { label: "UTC+08:00", value: "UTC+8" },
  { label: "UTC+09:00", value: "UTC+9" },
  { label: "UTC+10:00", value: "UTC+10" },
  { label: "UTC+11:00", value: "UTC+11" },
  { label: "UTC+12:00", value: "UTC+12" },
];

const dateFormats = [
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
];

export default function AdminProfileSettings() {
  const toast = useRef<Toast>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const languages = [
    { label: t("profile.english"), value: "en" },
    { label: t("profile.spanish"), value: "es" },
    { label: t("profile.french"), value: "fr" },
    { label: t("profile.german"), value: "de" },
  ];
  const themes = [
    { label: t("profile.light"), value: "light" },
    { label: t("profile.dark"), value: "dark" },
    { label: t("profile.auto"), value: "auto" },
  ];
  const [settingsData, setSettingsData] = useState<SettingsData>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    language: 'en',
    timezone: 'UTC+0',
    dateFormat: 'MM/DD/YYYY',
    theme: 'light',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && canAccessSection(user.role, 'canAccessAll')) {
      loadSettingsData();
    }
  }, [user]);

  const loadSettingsData = async () => {
    try {
      // In a real app, this would fetch from an API
      setSettingsData({
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        marketingEmails: false,
        language: 'en',
        timezone: 'UTC+0',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light',
      });
    } catch (error) {
      console.error("Error loading settings data:", error);
      showToast("error", t("common.error"), t("profile.failedToLoadSettings"));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast("success", t("common.success"), t("profile.settingsUpdated"));
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("error", t("common.error"), t("profile.failedToSaveSettings"));
    } finally {
      setSaving(false);
    }
  };

  const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 3000 });
  };

  if (!user || !canAccessSection(user.role, 'canAccessAll')) {
    return (
      <div className="flex align-items-center justify-content-center min-h-screen">
        <div className="text-center">
          <i className="pi pi-exclamation-triangle text-4xl text-red-500 mb-3"></i>
          <h2>{t("auth.accessDenied")}</h2>
          <p>{t("auth.onlyAdminAccess")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">{t("menu.accountSettings")}</h1>
            <p className="text-600 mt-2 mb-0">{t("profile.accountSettingsSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="col-12 lg:col-8 flex">
        <Card title={t("profile.notificationPreferences")} className="mb-4 flex-1 h-full">
          <div className="grid">
            <div className="col-12">
              <div className="flex align-items-center gap-3 mb-4">
                <Checkbox
                  checked={settingsData.emailNotifications}
                  onChange={(e) => setSettingsData({ ...settingsData, emailNotifications: e.checked || false })}
                />
                <div>
                  <label className="text-900 font-medium">{t("profile.emailNotifications")}</label>
                  <p className="text-600 text-sm m-0">{t("profile.emailNotificationsDesc")}</p>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="flex align-items-center gap-3 mb-4">
                <Checkbox
                  checked={settingsData.smsNotifications}
                  onChange={(e) => setSettingsData({ ...settingsData, smsNotifications: e.checked || false })}
                />
                <div>
                  <label className="text-900 font-medium">{t("profile.smsNotifications")}</label>
                  <p className="text-600 text-sm m-0">{t("profile.smsNotificationsDesc")}</p>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="flex align-items-center gap-3 mb-4">
                <Checkbox
                  checked={settingsData.pushNotifications}
                  onChange={(e) => setSettingsData({ ...settingsData, pushNotifications: e.checked || false })}
                />
                <div>
                  <label className="text-900 font-medium">{t("profile.pushNotifications")}</label>
                  <p className="text-600 text-sm m-0">{t("profile.pushNotificationsDesc")}</p>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="flex align-items-center gap-3">
                <Checkbox
                  checked={settingsData.marketingEmails}
                  onChange={(e) => setSettingsData({ ...settingsData, marketingEmails: e.checked || false })}
                />
                <div>
                  <label className="text-900 font-medium">{t("profile.marketingEmails")}</label>
                  <p className="text-600 text-sm m-0">{t("profile.marketingEmailsDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-4 flex">
        <Card title={t("profile.accountActions")} className="mb-4 flex-1 h-full">
          <div className="flex flex-column gap-3">
            <Button
              label={t("profile.exportData")}
              icon="pi pi-download"
              className="p-button-outlined"
              onClick={() => showToast("info", t("common.info"), t("profile.dataExportInitiated"))}
            />
            <Button
              label={t("profile.downloadBackup")}
              icon="pi pi-file"
              className="p-button-outlined"
              onClick={() => showToast("info", t("common.info"), t("profile.backupStarted"))}
            />
            <Button
              label={t("profile.clearCache")}
              icon="pi pi-refresh"
              className="p-button-outlined"
              onClick={() => showToast("info", t("common.info"), t("profile.cacheCleared"))}
            />
            <Button
              label={t("profile.signOutAllDevices")}
              icon="pi pi-sign-out"
              className="p-button-outlined p-button-danger"
              onClick={() => showToast("warn", t("common.warning"), t("profile.allDevicesSignedOut"))}
            />
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-8 flex">
        <Card title={t("profile.displayPreferences")} className="mb-4 flex-1 h-full">
          <div className="grid">
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.language")}</label>
              <Dropdown
                value={settingsData.language}
                options={languages}
                onChange={(e) => setSettingsData({ ...settingsData, language: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.timezone")}</label>
              <Dropdown
                value={settingsData.timezone}
                options={timezones}
                onChange={(e) => setSettingsData({ ...settingsData, timezone: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.dateFormat")}</label>
              <Dropdown
                value={settingsData.dateFormat}
                options={dateFormats}
                onChange={(e) => setSettingsData({ ...settingsData, dateFormat: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">{t("profile.theme")}</label>
              <Dropdown
                value={settingsData.theme}
                options={themes}
                onChange={(e) => setSettingsData({ ...settingsData, theme: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-4 flex">
        <Card title={t("profile.dangerZone")} className="mb-4 flex-1 h-full">
          <div className="flex flex-column gap-3">
            <Button
              label={t("profile.deactivateAccount")}
              icon="pi pi-ban"
              className="p-button-outlined p-button-danger"
              onClick={() => showToast("warn", t("common.warning"), t("profile.deactivateConfirm"))}
            />
            <Button
              label={t("profile.deleteAccount")}
              icon="pi pi-trash"
              className="p-button-outlined p-button-danger"
              onClick={() => showToast("error", t("common.error"), t("profile.deleteConfirm"))}
            />
          </div>
        </Card>
      </div>

      <div className="col-12">
        <div className="flex justify-content-end gap-3">
          <Button
            label={t("profile.resetToDefault")}
            icon="pi pi-refresh"
            className="p-button-outlined"
            onClick={() => loadSettingsData()}
          />
          <Button
            label={t("profile.saveSettings")}
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
