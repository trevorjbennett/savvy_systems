# SAVVY Branch Strategy

This repository uses a multi-branch strategy to maintain separate editions of SAVVY.

## Branches

### `main` (Development)
- **Purpose:** Main development branch for shared features
- **Usage:** Primary development happens here
- **Merges to:** Both `community` and `enterprise`

### `community` (Community Edition - FREE)
- **Purpose:** Open-source, free version for individual users and small teams
- **Features:**
  - Browse Chocolatey + WinGet packages
  - Search, filters, sorting
  - Collections (unlimited)
  - Personas (unlimited)  
  - Collection sharing (public + targeted)
  - Batch operations
  - Update notifications
  - Local storage only
  - No Firebase/backend required
- **License:** MIT (Open Source)
- **Target Users:** Individual developers, hobbyists, small projects
- **Distribution:** GitHub releases, open source

### `enterprise` (Enterprise Edition - PAID)
- **Purpose:** Commercial version with governance, RBAC, and cloud sync
- **Features:**
  - All Community features, PLUS:
  - Firebase cloud sync
  - User roles (Owner/Admin/Operator/Viewer)
  - Approval workflows
  - Policy engine (allow/deny lists, version constraints)
  - Admin panel (user management, policies, audit logs)
  - Organization management
  - Compliance reports & exports
  - Real-time collaboration
  - Priority support
- **License:** Proprietary
- **Target Users:** IT teams, companies, organizations
- **Distribution:** Licensed downloads
- **Pricing:** $50-100/user/year

## Workflow

### Adding Features to Both Editions
1. Develop in `main` branch
2. Test thoroughly
3. Merge to `community`:
   ```bash
   git checkout community
   git merge main
   ```
4. Merge to `enterprise`:
   ```bash
   git checkout enterprise
   git merge main
   ```

### Adding Community-Only Features
1. Checkout `community` branch
2. Develop feature
3. Commit and push
4. DO NOT merge back to `main` or `enterprise`

### Adding Enterprise-Only Features
1. Checkout `enterprise` branch
2. Develop feature (e.g., admin panel, Firebase integration)
3. Commit and push
4. DO NOT merge back to `main` or `community`

### Bug Fixes
1. If bug exists in all editions: Fix in `main`, merge to both
2. If bug is community-specific: Fix in `community` only
3. If bug is enterprise-specific: Fix in `enterprise` only

## Current Status

**As of today:**
- ✅ `main`: Initial commit with all current features
- ✅ `community`: Identical to main (will remain free/open source)
- ✅ `enterprise`: Identical to main (will add governance features)

**Next Steps:**
- Continue development in `main` or `community` for Community Edition polish
- When ready to add enterprise features, branch from `enterprise`

## Notes

- The `community` branch should be kept simple and lightweight
- The `enterprise` branch will grow with additional dependencies (Firebase, etc.)
- Always document which edition a feature belongs to in commit messages
- Use branch protection rules on GitHub:
  - `main`: Require PR reviews
  - `community`: Public, allow community contributions
  - `enterprise`: Private, internal only
