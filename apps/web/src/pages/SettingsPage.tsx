import React, { lazy, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, Code2, Database, History, Info, Puzzle, Settings, Shield, Users, User as UserIcon } from "lucide-react";
import { AboutSettings } from "../components/AboutSettings";
import { ApiKeysSettings } from "../components/ApiKeysSettings";
import { GeneralSettings } from "../components/GeneralSettings";
import { IntegrationsSettings } from "../components/IntegrationsSettings";
import { NotificationsSettings } from "../components/NotificationsSettings";
import { PreferencesIcon, PreferencesSettings } from "../components/PreferencesSettings";
import { ProfileSettings } from "../components/ProfileSettings";
import { SecuritySettings } from "../components/SecuritySettings";
import { StorageSettings } from "../components/StorageSettings";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuditLogsPage } from "./AuditLogsPage";
import { useAuth } from "../context/AuthContext";
import { workspaceFeatures } from "../config/workspace";
import "./SettingsPage.css";

const AccountsSettings = lazy(() => import("../components/AccountsSettings").then(module => ({ default: module.AccountsSettings })));

const sections = [
  { id: "general", label: "General", Icon: Settings, Content: GeneralSettings },
  { id: "profile", label: "Profile", Icon: UserIcon, Content: ProfileSettings },
  { id: "security", label: "Security", Icon: Shield, Content: SecuritySettings },
  { id: "integrations", label: "Integrations", Icon: Puzzle, Content: IntegrationsSettings },
  { id: "storage", label: "Storage", Icon: Database, Content: StorageSettings, adminOnly: true },
  { id: "activity", label: "Activity & Logs", Icon: History, Content: AuditLogsPage },
  { id: "accounts", label: "Accounts", Icon: Users, Content: AccountsSettings, adminOnly: true },
  { id: "notifications", label: "Notifications", Icon: Bell, Content: NotificationsSettings },
  { id: "apikeys", label: "API Keys", Icon: Code2, Content: ApiKeysSettings },
  { id: "preferences", label: "Preferences", Icon: PreferencesIcon, Content: PreferencesSettings },
  { id: "about", label: "About", Icon: Info, Content: AboutSettings },
] as const;

export const SettingsPage: React.FC = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const availableSections = sections.filter(section => section.id !== "accounts" || workspaceFeatures.accountManagement);
  const activeSection = availableSections.find(section => section.id === searchParams.get("tab")) ?? sections[1];
  const { id: activeTab, label, Content } = activeSection;
  const requiresAdmin = "adminOnly" in activeSection && activeSection.adminOnly;
  const navigation = availableSections.filter(section => !("adminOnly" in section) || !section.adminOnly || user?.role === "ADMIN");

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeTab]);

  function selectTab(id: string) {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set("tab", id);
      return next;
    });
  }

  return <div className="settings-dashboard" data-settings-tab={activeTab}>
    <aside className="settings-navigation">
      <h1>Settings</h1>
      <p>Manage your account, installation, integrations, and preferences.</p>
      <nav aria-label="Settings sections">
        {navigation.map(({ id, label, Icon }) => <button key={id} type="button"
          aria-current={activeTab === id ? "page" : undefined} onClick={() => selectTab(id)}>
          <Icon size={21} />{label}
        </button>)}
      </nav>
    </aside>
    <div className="settings-content" ref={contentRef} role="region" aria-label={`${label} settings`} tabIndex={0}>
      <header className="settings-breadcrumb settings-breadcrumb-general"><span>Settings</span><span aria-hidden="true">›</span><h1>{label}</h1></header>
      {requiresAdmin ? <ProtectedRoute adminOnly><Content /></ProtectedRoute> : <Content key={user?.id} />}
    </div>
  </div>;
};
