// Permissões por perfil: mesmas regras de frontend/src/rules.js.
const rules: Record<string, { static: string[] }> = {
  user: { static: [] },
  admin: {
    static: [
      "dashboard:view",
      "drawer-admin-items:view",
      "tickets-manager:showall",
      "user-modal:editProfile",
      "user-modal:editQueues",
      "ticket-options:deleteTicket",
      "contacts-page:deleteContact",
      "connections-page:actionButtons",
      "connections-page:addConnection",
      "connections-page:editOrDeleteConnection"
    ]
  }
};

export const can = (role: string | undefined, action: string): boolean =>
  !!role && !!rules[role]?.static.includes(action);
