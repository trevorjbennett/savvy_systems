# SAVVY

A modern, governance-first package manager GUI for Windows that unifies Chocolatey and WinGet.

## Editions

This repository maintains two editions of SAVVY:

- **[Community Edition](../../tree/community)** - Free and open source
- **[Enterprise Edition](../../tree/enterprise)** - Commercial version with governance features

See [BRANCHES.md](BRANCHES.md) for details on our branch strategy.

---

## Community Edition (FREE)

A beautiful, Swiss minimal design package manager for Windows.

### Features

- 🔍 **Unified Package Management** - Browse and manage both Chocolatey and WinGet packages in one interface
- 📦 **Collections** - Group your favorite packages into shareable collections
- 👤 **Personas** - Switch between different user profiles (work, personal, client setups)
- 🤝 **Sharing** - Share collections publicly or with specific users
- ⚡ **Batch Operations** - Install, update, or remove multiple packages at once
- 🔔 **Update Notifications** - Get notified when package updates are available
- 🔗 **Dependencies** - View package dependencies and relationships
- 💾 **Local Storage** - All data stored locally, no backend required
- 🎨 **Swiss Minimal Design** - Clean, professional interface

### Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Desktop:** Tauri v2 (Rust-based)
- **Styling:** CSS with custom properties (dark mode support)
- **Storage:** LocalStorage (no backend required)

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build desktop app
npm run tauri build
```

### Development

```bash
# Run both Vite dev server and Tauri in dev mode
npm run tauri dev
```

---

## Enterprise Edition (PAID)

All Community features plus governance, RBAC, and cloud sync.

### Additional Features

- ☁️ **Cloud Sync** - Firebase-powered real-time synchronization
- 👥 **User Roles** - Owner, Admin, Operator, and Viewer roles
- ✅ **Approval Workflows** - Request-to-install with admin approval
- 📋 **Policy Engine** - Allow/deny lists and version constraints
- ⚙️ **Admin Panel** - Centralized user, policy, and audit management
- 📊 **Audit Logging** - Complete activity trails for compliance
- 🏢 **Organization Management** - Multi-user team collaboration
- 📈 **Compliance Reports** - Export audit logs and activity reports
- 🎯 **Priority Support** - Email support with SLA

### Pricing

- **Team:** $50-100/user/year (5-50 users)
- **Enterprise:** Custom pricing (50+ users)

[Learn more about Enterprise →](https://savvy.app/enterprise)

---

## Documentation

- [Branch Strategy](BRANCHES.md)
- [Contributing](CONTRIBUTING.md) *(coming soon)*
- [User Guide](docs/USER_GUIDE.md) *(coming soon)*

## License

- **Community Edition:** MIT License (Open Source)
- **Enterprise Edition:** Proprietary

## Support

- **Community:** [GitHub Issues](../../issues)
- **Enterprise:** Priority email support

---

**Built with ❤️ for the Windows developer community**
