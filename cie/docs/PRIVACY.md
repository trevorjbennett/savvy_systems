# Community Intelligence Engine - Privacy Policy

**Last Updated:** January 2025

## Our Privacy Commitment

The Community Intelligence Engine (CIE) is designed with **privacy as a core principle**. We collect only anonymous, aggregated data to improve SAVVY for everyone. We never collect personal information.

---

## What We Collect

### ✅ Data We COLLECT (Anonymous Only)

| Data Point | Example | Why We Need It |
|------------|---------|----------------|
| **Package ID** | `docker-desktop`, `git` | To identify which packages have issues |
| **Error Code** | `1603`, `0x80070005` | To categorize errors |
| **Error Message (Sanitized)** | `Installation failed` | To understand what went wrong |
| **OS Version** | `Windows 11 23H2` | To identify OS-specific issues |
| **Package Manager** | `choco` or `winget` | To track manager-specific problems |
| **Timestamp (Rounded)** | `2025-01-15 10:00:00` | To track trends over time |
| **Anonymous Device Hash** | `abc123...` (SHA256) | To detect patterns without identifying users |
| **Success/Failure** | `true` or `false` | To measure package reliability |

### ❌ Data We DO NOT Collect

- ❌ Your name, email, or username
- ❌ Your device name or hostname
- ❌ File paths or directory structures
- ❌ IP addresses (not logged)
- ❌ Any personally identifiable information (PII)
- ❌ Location data
- ❌ Browsing history
- ❌ Installed programs (except those managed by SAVVY)

---

## How We Anonymize Data

### Device Hashing
Your device is assigned a random, anonymous identifier:
```
Device MAC + Random Salt → SHA256 → abc123def456...
```
- This hash cannot be reversed to identify you
- The salt is stored only on your device
- We cannot link the hash back to you

### Timestamp Rounding
All timestamps are rounded to the nearest hour:
```
2025-01-15 14:37:23 → 2025-01-15 14:00:00
```
This prevents tracking your exact usage patterns.

### Message Sanitization
Error messages are automatically cleaned:
```
Before: "C:\Users\John\Documents\file.txt not found"
After:  "[REDACTED_PATH] not found"
```
All file paths, usernames, and personal data are removed.

---

## How We Use Your Data

### Error Dictionary
We aggregate anonymous error reports to build a knowledge base:
- Identify common installation issues
- Track error frequency
- Match errors with solutions

**Example:**
```
Package: Docker Desktop
Error: 1603
Reported: 1,247 times
Most Common Fix: Enable Hyper-V (92% success rate)
```

### Product Improvements
We analyze trends to improve SAVVY:
- Which packages fail most often?
- Which OS versions have more issues?
- Are errors increasing or decreasing?

### Community Benefits
Your anonymous data helps other users:
- Automatic error suggestions
- Crowdsourced solutions
- Faster problem resolution

---

## Who Has Access

### Within SAVVY
- **Engineering team:** Aggregate statistics only (not individual events)
- **Support team:** No access (they don't need telemetry to help you)
- **No one else:** We don't share data internally

### External Parties
- **Third-party services:** We do NOT share data with anyone
- **Advertisers:** We don't sell or share data (ever)
- **Law enforcement:** We cannot provide data on individuals (we don't have it)

---

## Your Rights & Controls

### Opt-In (Community Edition)
Telemetry is **disabled by default** for Community Edition.

To enable:
1. Open SAVVY Settings
2. Go to "Privacy & Data"
3. Toggle "Help improve SAVVY"
4. Read this policy and accept

### Opt-Out (Enterprise Edition)
Telemetry is **enabled by default** for Enterprise Edition (but can be disabled).

To disable:
1. Open SAVVY Settings
2. Go to "Privacy & Data"
3. Toggle off "Share anonymous usage data"
4. Save changes

**Effect of opting out:**
- No data sent to CIE
- You still see error suggestions (from other users' data)
- No impact on SAVVY functionality

### Data Deletion
**Individual events:** We cannot delete your specific events because they're anonymous (we don't know which are yours).

**Device hash:** To "reset" your device:
1. Disable CIE in settings
2. Clear SAVVY's localStorage
3. Re-enable CIE (new hash will be generated)

**Organization data (Enterprise):** Admins can request deletion of all org data by contacting support@savvy.app.

---

## Data Storage & Retention

### Where Data is Stored
- **Cloud provider:** [AWS/Azure/GCP - TBD]
- **Region:** United States (with EU option for Enterprise)
- **Encryption:** AES-256 at rest, TLS 1.3 in transit

### How Long We Keep Data
- **Raw events:** 90 days, then deleted
- **Aggregated statistics:** Kept indefinitely (no way to trace back to individuals)
- **Error dictionary:** Kept indefinitely (community knowledge base)

---

## Security Measures

### Data Protection
- ✅ HTTPS only (TLS 1.3)
- ✅ Encrypted database
- ✅ No public database access
- ✅ Rate limiting and DDoS protection
- ✅ Regular security audits

### Breach Notification
In the unlikely event of a data breach:
1. We'll investigate immediately
2. Notify affected users within 72 hours
3. Post public incident report
4. Take corrective actions

**Note:** Since we don't collect PII, a breach would not expose personal information.

---

## Children's Privacy

SAVVY is not intended for children under 13. We do not knowingly collect data from children.

---

## Changes to This Policy

We may update this policy as CIE evolves. Changes will be:
- Posted on this page
- Announced in-app
- Highlighted in release notes
- Require re-consent for major changes

**Version History:**
- v1.0 (Jan 2025): Initial release

---

## Transparency Reports

We publish quarterly transparency reports:
- Total events collected
- Number of opted-in users
- Top errors and solutions
- Zero PII collected (verified by audit)

**Latest report:** [Link when available]

---

## Contact & Questions

### Privacy Questions
Email: privacy@savvy.app

### Data Subject Requests
Email: dsar@savvy.app

### Security Issues
Email: security@savvy.app

### General Support
GitHub: https://github.com/trevorjbennett/savvy_systems/issues

---

## Third-Party Services

CIE uses the following services:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Cloud Hosting | Store database | Anonymous events only |
| Sentry | Error tracking | Error logs (no PII) |
| Cloudflare | CDN & DDoS protection | IP addresses (not logged) |

**Note:** All third parties are contractually bound to not use data for their own purposes.

---

## Legal Basis (GDPR)

For users in the European Union:

**Legal basis:** Legitimate interest (improving product quality)

**Your rights:**
- Right to access (we can't identify your data)
- Right to deletion (we can delete org data on request)
- Right to object (opt-out anytime)
- Right to portability (not applicable to anonymous data)

**Data controller:** SAVVY Systems
**Data protection officer:** [Name/Email when appointed]

---

## California Privacy Rights (CCPA)

For California residents:

**We do not sell personal information** (we don't collect it).

**Your rights:**
- Right to know what data we collect (listed above)
- Right to delete (org data only, on request)
- Right to opt-out of "sales" (not applicable)

---

## Summary

**In Plain English:**
- We collect anonymous error data to build a helpful error dictionary
- We can't identify you from the data we collect
- You can opt-out anytime
- We never sell or share your data
- Your privacy is our top priority

**Questions?** Email privacy@savvy.app

---

**By enabling CIE, you agree to this privacy policy.**
