# Project Overview

## Introduction
The **NEVHA App** is the official community management platform for the **Northfields Executive Village Homeowners Association (NEVHA)**. It is a Progressive Web App (PWA) designed to streamline communication and services for residents and the administration.

## Key Features
- **Announcements**: Residents can view important community updates and notice. Supports categorized and pinned announcements.
- **Issue Reporting**: A multi-step **Report Wizard** for maintenance requests and concerns. includes category selection, resident verification, and offline support.
- **Issue Tracking**: A redesigned **Status Page** with a tabbed search system (By Reference Code or Email) to track progress.
- **Digital Billing**: A **Bills Page** using an iOS Wallet-style interface to view and manage HOA dues.
- **Resident Profile**: A centralized **Profile Page** for managing account details, viewing status, and app information.
- **Admin Dashboard**: A comprehensive portal for HOA staff to manage homeowners, issues, announcements, and system health.
- **Security & Validation**: Strict, site-wide validation for email and phone formats to ensure high data integrity.

## Quick Start
To set up the project locally, follow these steps:

### Prerequisites
- Node.js (Latest LTS recommended)
- pnpm (Package manager)
- Supabase account (for backend services)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd v0-nevha
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

### Environment Setup
1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  Fill in the required environment variables in `.env`:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - other optional keys as needed.

### Running Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
