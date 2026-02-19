# Theta - Project Management SaaS

A complete, production-ready project management SaaS application built with Next.js 14, React, TypeScript, and modern web technologies. Theta features multi-tenant workspaces, AI-powered assistance (Boots), real-time notifications, and comprehensive project management tools.

## 🚀 Features

### Core Management
- 🔐 **Multi-Tenant Authentication** - Secure authentication with Clerk, featuring automatic user and workspace provisioning.
- 🏢 **Workspace Isolation** - Strict data separation between workspaces with independent settings, billing, and team management.
- 📊 **Dynamic Dashboard** - Real-time overview of project progress, task status, and team activity with visual analytics.
- 📁 **Project Management** - Organize work into projects with cover images, descriptions, and privacy settings.
- ✅ **Advanced Task System** - Task management with priorities, status tracking, due dates, and rich media attachments.
- 📋 **Kanban Boards** - Visual project management with fluid drag-and-drop boards and custom columns.
- 👥 **Team Collaboration** - Role-based access control (RBAC), team member management, and workspace-wide permissions.
- 📅 **Smart Calendar** - Integrated scheduling system with support for recurring events and team-wide visibility.

### Advanced Capabilities
- 🤖 **Boots AI Assistant** - Specialized AI generation powered by Google Gemini for project descriptions, task breakdowns, and content drafting.
- 🔔 **Real-time Notifications** - Instant updates via Ably integration for task assignments, mentions, and system alerts.
- 📈 **Detailed Analytics** - In-depth insights into workspace usage, team productivity, and project health.
- 📝 **Audit Logs** - Comprehensive activity tracking across all workspace entities for transparency and security.
- 🔍 **Global Search** - Lightning-fast search across projects, tasks, members, and documents.
- 💬 **Integrated Chat** - Real-time team communication channels nested within workspaces.
- 🔗 **Third-Party Integrations** - Connect with external tools like Slack for seamless workflow automation.
- 📤 **Universal File Management** - Cloudinary-powered management for images, videos, and documents with plan-based storage limits.

### Administrative & Billing
- 💳 **Enterprise Billing** - Checkout.com-powered subscription management with multiple plan tiers.
- 🌍 **Internationalization** - Built-in multi-language support (i18n) for global teams.
- ✉️ **Secure Invites** - Token-based invitation system for bringing members into specific workspaces or teams.
- 👤 **Profile & Settings** - Granular user preferences and workspace configuration options.

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Authentication**: Clerk
- **Database**: MongoDB with Prisma ORM
- **Payments**: Checkout.com
- **File Storage**: Cloudinary
- **AI**: Google Gemini (Boots AI)
- **Email**: Resend
- **Real-time**: Ably (WebSockets)
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Validation**: Zod

## 🏁 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB database (Atlas or local)
- Clerk account for authentication
- Checkout.com account for payment processing
- Cloudinary account for file storage
- Google AI Studio (Gemini) API key
- Resend account for email delivery
- Ably account for real-time features

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory and populate it with the following:
   ```env
   # Database
   MONGODB_URI="your_mongodb_connection_string"

   # Authentication (Clerk)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"

   # Payments (Checkout.com)
   CHECKOUT_SECRET_KEY="sk_test_..."
   CHECKOUT_PUBLIC_KEY="pk_test_..."
   CHECKOUT_WEBHOOK_SECRET="whsec_..."

   # File Storage (Cloudinary)
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"

   # AI (Google Gemini)
   GEMINI_API_KEY="your_gemini_api_key"

   # Real-time (Ably)
   ABLY_API_KEY="your_ably_api_key"
   NEXT_PUBLIC_ABLY_PUBLISHABLE_KEY="your_ably_publishable_key"

   # Email (Resend)
   RESEND_API_KEY="re_..."
   ```

3. **Initialize Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

### Workspace Architecture (`/app`)
The application uses Next.js App Router with specialized route groupings:
- `(dashboard)/` - Contains all authenticated workspace-scoped routes.
  - `dashboard/` - Main overview and statistics.
  - `projects/`, `tasks/`, `boards/` - Key management modules.
  - `teams/`, `settings/`, `billing/` - Administrative modules.
  - `calendar/`, `notifications/`, `analytics/` - Support modules.
- `api/` - Backend service layer (Workspace-protected).
  - `ai/` - Boots AI content generation endpoints.
  - `billing/` & `checkout/` - Subscription and payment processing.
  - `webhooks/` - Handlers for Checkout.com and other external events.
  - `upload/` - Secure file upload signatures and management.
- `pricing/` - Public-facing subscription plans page.

### Business Logic & Utilities (`/lib`)
The core processing engine of Theta:
- `auth.ts` - Custom auth logic and Clerk integration.
- `billing-plans.ts` - Definition of subscription tiers and pricing.
- `plan-limits.ts` - Middleware-level enforcement of feature and storage quotas.
- `usage-tracking.ts` - Service for monitoring real-time consumption (AI requests, storage, etc.).
- `gemini.ts` - Configuration and prompt engineering for Boots AI.
- `ably.ts` - Real-time pub/sub infrastructure for notifications and chat.
- `notifications.ts` - Multi-channel notification delivery logic.
- `integrations/` - Third-party service connectors (e.g., Slack).
- `prisma.ts` - Specialized Prisma client with middleware for data isolation.

### UI Components (`/components`)
- `ui/` - Atomic design system components built on shadcn/ui.
- `layout/` - Shell components including Sidebar, Navbar, and Workspace Switcher.
- `ai/` - Interactive Boots AI interface components.
- `billing/` - Checkout forms, pricing tables, and usage meters.
- `common/` - Shared high-level components like `FileUpload` and `DataTable`.

## ⚙️ Key System Implementations

### Multi-Tenant Architecture
Theta implements a standard multi-tenancy model where every entity (Project, Task, etc.) is linked to a `WorkspaceID`. Middleware and database utilities ensure that users can only access data belonging to their currently active workspace, even if they are members of multiple.

### Usage-Based Limits
The application features a robust usage enforcement system:
- **Project/Task Quotas**: Limits on total entries per workspace.
- **Storage Limits**: Cumulative file size monitoring via Cloudinary.
- **AI Credits**: Periodic reset of AI generation requests based on plan tier.
- **Member Limits**: Controls on the number of team members in a workspace.

### Boots AI (Gemini)
Boots AI is deeply integrated into the workflow. It uses Google's Gemini Pro model to:
1.  Draft project roadmaps and descriptions.
2.  Generate task lists from high-level project goals.
3.  Summarize activity logs and project progress.
4.  Provide contextual help within the workspace.

## 💳 Billing & Plans

| Plan | Price | Projects | Tasks | Storage | AI Requests |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Free** | $0 | 3 | 25 | 100MB | 10/mo |
| **Growth** | $12 | 15 | 150 | 5GB | 100/mo |
| **Pro** | $29 | 100 | Unlimited | 50GB | 500/mo |
| **Theta Plus** | $99 | Unlimited | Unlimited | 500GB | 5,000/mo |
| **Lifetime** | $999 (Once) | Unlimited | Unlimited | 500GB | Unlimited |

## 🧪 Development Commands

- `npm run build` - Create production bundle.
- `npx prisma studio` - Graphical interface for database management.
- `npx prisma db push` - Sync schema changes to MongoDB.

## 📄 License

This project is private and proprietary. All rights reserved.
