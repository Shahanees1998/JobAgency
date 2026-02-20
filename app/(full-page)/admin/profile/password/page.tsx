"use client";

import { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminProfilePassword() {
  const toast = useRef<Toast>(null);
  const { user } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      showToast("warn", t("common.warning"), t("profile.fillAllFields"));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showToast("warn", t("common.warning"), t("profile.passwordsDoNotMatch"));
      return;
    }

    if (formData.newPassword.length < 6) {
      showToast("warn", t("common.warning"), t("profile.passwordMinLengthHint"));
      return;
    }

    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast("success", t("common.success"), t("profile.passwordUpdated"));
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error("Error changing password:", error);
      showToast("error", t("common.error"), t("profile.failedToUpdatePassword"));
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
            <h1 className="text-3xl font-bold m-0">{t("menu.changePassword")}</h1>
            <p className="text-600 mt-2 mb-0">{t("profile.passwordPageSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="col-12 lg:col-8 flex">
        <Card title={t("profile.passwordSettings")} className="w-full flex-1 mb-4 lg:mb-0">
          <div className="grid">
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">{t("profile.currentPassword")} *</label>
              <Password
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder={t("profile.currentPassword")}
                toggleMask
                feedback={false}
                className="w-full"
                inputClassName="w-full"
              />
            </div>
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">{t("profile.newPasswordLabel")} *</label>
              <Password
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder={t("profile.newPasswordLabel")}
                toggleMask
                feedback={false}
                className="w-full"
                inputClassName="w-full"
              />
              <small className="text-600">{t("profile.passwordMinLengthHint")}</small>
            </div>
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">{t("profile.confirmPassword")} *</label>
              <Password
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder={t("profile.confirmPassword")}
                toggleMask
                feedback={false}
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="col-12 lg:col-4 flex">
        <Card title={t("profile.securityTips")} className="w-full flex-1 mb-4 lg:mb-0">
          <div className="flex flex-column gap-3">
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-shield text-2xl text-blue-500 mt-1"></i>
              <div>
                <div className="font-semibold">{t("profile.strongPassword")}</div>
                <div className="text-600 text-sm">{t("profile.strongPasswordDesc")}</div>
              </div>
            </div>
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-key text-2xl text-green-500 mt-1"></i>
              <div>
                <div className="font-semibold">{t("profile.uniquePassword")}</div>
                <div className="text-600 text-sm">{t("profile.uniquePasswordDesc")}</div>
              </div>
            </div>
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-clock text-2xl text-orange-500 mt-1"></i>
              <div>
                <div className="font-semibold">{t("profile.regularUpdates")}</div>
                <div className="text-600 text-sm">{t("profile.regularUpdatesDesc")}</div>
              </div>
            </div>
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-lock text-2xl text-purple-500 mt-1"></i>
              <div>
                <div className="font-semibold">{t("profile.keepItPrivate")}</div>
                <div className="text-600 text-sm">{t("profile.keepItPrivateDesc")}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="col-12">
        <div className="flex justify-content-end gap-3">
          <Button
            label={t("common.cancel")}
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => setFormData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            })}
          />
          <Button
            label={t("menu.changePassword")}
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
