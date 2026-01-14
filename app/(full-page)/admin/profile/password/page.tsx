"use client";

import { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessSection } from "@/lib/rolePermissions";

export default function AdminProfilePassword() {
  const toast = useRef<Toast>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      showToast("warn", "Warning", "Please fill in all fields");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showToast("warn", "Warning", "New passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      showToast("warn", "Warning", "Password must be at least 6 characters long");
      return;
    }

    setSaving(true);
    try {
      // In a real app, this would call the password change API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast("success", "Success", "Password changed successfully");
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error("Error changing password:", error);
      showToast("error", "Error", "Failed to change password");
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
            <h1 className="text-3xl font-bold m-0">Change Password</h1>
            <p className="text-600 mt-2 mb-0">Update your account password for enhanced security.</p>
          </div>
        </div>
      </div>

      {/* Password Form */}
      <div className="col-12 lg:col-8">
        <Card title="Password Settings" className="mb-4">
          <div className="grid">
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">Current Password *</label>
              <Password
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                toggleMask
                className="w-full"
                inputClassName="w-full"
              />
            </div>
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">New Password *</label>
              <Password
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Enter new password"
                toggleMask
                className="w-full"
                inputClassName="w-full"
              />
              <small className="text-600">Password must be at least 6 characters long</small>
            </div>
            <div className="col-12">
              <label className="block text-900 font-medium mb-2">Confirm New Password *</label>
              <Password
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                toggleMask
                className="w-full"
                inputClassName="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Security Tips */}
      <div className="col-12 lg:col-4">
        <Card title="Security Tips" className="mb-4">
          <div className="flex flex-column gap-3">
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-shield text-2xl text-blue-500 mt-1"></i>
              <div>
                <div className="font-semibold">Strong Password</div>
                <div className="text-600 text-sm">Use a combination of letters, numbers, and symbols</div>
              </div>
            </div>
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-key text-2xl text-green-500 mt-1"></i>
              <div>
                <div className="font-semibold">Unique Password</div>
                <div className="text-600 text-sm">Don't reuse passwords from other accounts</div>
              </div>
            </div>
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-clock text-2xl text-orange-500 mt-1"></i>
              <div>
                <div className="font-semibold">Regular Updates</div>
                <div className="text-600 text-sm">Change your password periodically for better security</div>
              </div>
            </div>
            <div className="flex align-items-start gap-3 p-3 border-1 border-200 border-round">
              <i className="pi pi-lock text-2xl text-purple-500 mt-1"></i>
              <div>
                <div className="font-semibold">Keep It Private</div>
                <div className="text-600 text-sm">Never share your password with anyone</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="col-12">
        <div className="flex justify-content-end gap-3">
          <Button
            label="Cancel"
            icon="pi pi-times"
            className="p-button-outlined"
            onClick={() => setFormData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            })}
          />
          <Button
            label="Change Password"
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
