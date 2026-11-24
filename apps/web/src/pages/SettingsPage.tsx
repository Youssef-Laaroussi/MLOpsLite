import React, { useState } from "react";
import { Bell, Code2, Info, Puzzle, Settings, Shield, User as UserIcon } from "lucide-react";
import { AboutSettings } from "../components/AboutSettings";
import { ApiKeysSettings } from "../components/ApiKeysSettings";
import { GeneralSettings } from "../components/GeneralSettings";
import { IntegrationsSettings } from "../components/IntegrationsSettings";
import { NotificationsSettings } from "../components/NotificationsSettings";
import { PreferencesIcon, PreferencesSettings } from "../components/PreferencesSettings";
import { ProfileSettings } from "../components/ProfileSettings";
import { SecuritySettings } from "../components/SecuritySettings";
import "./SettingsPage.css";

const sections = [
  { id: "general", label: "General", Icon: Settings, Content: GeneralSettings },
  { id: "profile", label: "Profile", Icon: UserIcon, Content: ProfileSettings },
  { id: "security", label: "Security", Icon: Shield, Content: SecuritySettings },
  { id: "integrations", label: "Integrations", Icon: Puzzle, Content: IntegrationsSettings },
  { id: "notifications", label: "Notifications", Icon: Bell, Content: NotificationsSettings },
  { id: "apikeys", label: "API Keys", Icon: Code2, Content: ApiKeysSettings },
  { id: "preferences", label: "Preferences", Icon: PreferencesIcon, Content: PreferencesSettings },
  { id: "about", label: "About", Icon: Info, Content: AboutSettings },
] as const;

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const { label, Content } = sections.find(section => section.id === activeTab) ?? sections[1];

  return <div className="settings-dashboard" data-settings-tab={activeTab}>
    <aside className="settings-navigation">
      <h1>Settings</h1>
      <p>Manage your profile, security, integrations, and preferences.</p>
      <nav aria-label="Settings sections">
        {sections.map(({ id, label, Icon }) => <button key={id} type="button"
          aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)}>
          <Icon size={21} />{label}
        </button>)}
      </nav>
    </aside>
    <div className="settings-content">
      <header className="settings-breadcrumb settings-breadcrumb-general"><span>Settings</span><span aria-hidden="true">›</span><h1>{label}</h1></header>
      <Content />
    </div>
  </div>;
};
