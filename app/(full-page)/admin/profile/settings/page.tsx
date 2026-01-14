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

const languages = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
];

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

const themes = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "auto" },
];

export default function AdminProfileSettings() {
  const toast = useRef<Toast>(null);
  const { user } = useAuth();
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
      showToast("error", "Error", "Failed to load settings");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast("success", "Success", "Settings updated successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast("error", "Error", "Failed to save settings");
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
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      {/* Header */}
      <div className="col-12">
        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold m-0">Account Settings</h1>
            <p className="text-600 mt-2 mb-0">Customize your account preferences and notification settings.</p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="col-12 lg:col-8">
        <Card title="Notification Preferences" className="mb-4">
          <div className="grid">
            <div className="col-12">
              <div className="flex align-items-center gap-3 mb-4">
                <Checkbox
                  checked={settingsData.emailNotifications}
                  onChange={(e) => setSettingsData({ ...settingsData, emailNotifications: e.checked || false })}
                />
                <div>
                  <label className="text-900 font-medium">Email Notifications</label>
                  <p className="text-600 text-sm m-0">Receive important updates and alerts via email</p>
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
                  <label className="text-900 font-medium">SMS Notifications</label>
                  <p className="text-600 text-sm m-0">Receive urgent alerts via text message</p>
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
                  <label className="text-900 font-medium">Push Notifications</label>
                  <p className="text-600 text-sm m-0">Receive browser notifications for real-time updates</p>
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
                  <label className="text-900 font-medium">Marketing Emails</label>
                  <p className="text-600 text-sm m-0">Receive promotional content and product updates</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Display Settings */}
        <Card title="Display Preferences" className="mb-4">
          <div className="grid">
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Language</label>
              <Dropdown
                value={settingsData.language}
                options={languages}
                onChange={(e) => setSettingsData({ ...settingsData, language: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Timezone</label>
              <Dropdown
                value={settingsData.timezone}
                options={timezones}
                onChange={(e) => setSettingsData({ ...settingsData, timezone: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Date Format</label>
              <Dropdown
                value={settingsData.dateFormat}
                options={dateFormats}
                onChange={(e) => setSettingsData({ ...settingsData, dateFormat: e.value })}
                optionLabel="label"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6">
              <label className="block text-900 font-medium mb-2">Theme</label>
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

      {/* Account Actions */}
      <div className="col-12 lg:col-4">
        <Card title="Account Actions" className="mb-4">
          <div className="flex flex-column gap-3">
            <Button
              label="Export Data"
              icon="pi pi-download"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Data export initiated")}
            />
            <Button
              label="Download Backup"
              icon="pi pi-file"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Backup download started")}
            />
            <Button
              label="Clear Cache"
              icon="pi pi-refresh"
              className="p-button-outlined"
              onClick={() => showToast("info", "Info", "Cache cleared")}
            />
            <Button
              label="Sign Out All Devices"
              icon="pi pi-sign-out"
              className="p-button-outlined p-button-danger"
              onClick={() => showToast("warn", "Warning", "All devices will be signed out")}
            />
          </div>
        </Card>

        <Card title="Danger Zone" className="mb-4">
          <div className="flex flex-column gap-3">
            <Button
              label="Deactivate Account"
              icon="pi pi-ban"
              className="p-button-outlined p-button-danger"
              onClick={() => showToast("warn", "Warning", "Account deactivation requires confirmation")}
            />
            <Button
              label="Delete Account"
              icon="pi pi-trash"
              className="p-button-outlined p-button-danger"
              onClick={() => showToast("error", "Error", "Account deletion is permanent and cannot be undone")}
            />
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="col-12">
        <div className="flex justify-content-end gap-3">
          <Button
            label="Reset to Default"
            icon="pi pi-refresh"
            className="p-button-outlined"
            onClick={() => loadSettingsData()}
          />
          <Button
            label="Save Settings"
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
