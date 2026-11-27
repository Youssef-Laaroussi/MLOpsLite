// Presentation only: preserve management screens for the future collaboration phase.
// Authentication and authorization remain enforced independently by the API.
export const workspaceFeatures = {
  projectCollaboration: false,
  accountManagement: false,
};

export const workspaceSettingsPaths = {
  storage: "/app/settings?tab=storage",
  activity: "/app/settings?tab=activity",
  accounts: "/app/settings?tab=accounts",
};
