# Admin Panel Guide

The Admin Panel (`/admin`) is the central control hub for managing the HOA application. Access is restricted to users with the `admin` or `staff` role.

## Dashboard
The main dashboard (`/admin`) provides a high-level overview of community activity.
*   **Key Metrics**: Total Homeowners, Open Issues, Pending Approvals, Total Vehicles.
*   **Recent Activity**: Feed of latest actions (e.g., "New issue reported by [Name]").
*   **Quick Actions**: Shortcuts to common tasks like "Create Announcement" or "Register Homeowner".

## User & Resident Management
*   **Users (`/admin/users`)**: Manage system accounts.
    *   **Create User**: Manually register admins or staff.
    *   **Reset Password**: Send password reset emails or manually update credentials.
*   **Homeowners (`/admin/homeowners`)**: detailed resident profiles.
    *   **House Profile**: View/Edit property details (Block, Lot, Phase).
    *   **Household Members**: Manage family members and tenants.
    *   **Vehicles**: Register cars and manage stickers.

## Content Management
*   **Announcements (`/admin/announcements`)**:
    *   **Create**: Draft and publish news.
    *   **Priority**: Set visibility (Low, Normal, High, Urgent).
    *   **Scheduling**: publish_date and expiry_date for automated visibility.

## Issue Tracking (`/admin/issues`)
Centralized helpdesk for resident concerns.
*   **List View**: Filter by status (Open, Resolved), Priority, or Category.
*   **Detail View**: See full report, photos, and location.
*   **Workflow**:
    *   **Assign**: Delegate to specific departments or staff.
    *   **Update Status**: Move from `NEW` -> `IN_PROGRESS` -> `RESOLVED`.
    *   **Department routing**: Automatic routing based on category (e.g., "Security" -> Security Dept).

## Financials & Assets
*   **Dues (`/admin/dues`)**: Track monthly association dues (if enabled). 
    *   *Note: Integration with external payment gateways may be separate.*
*   **Parking (`/admin/parking`)**: Manage parking slot allocations and vehicle stickers.

## System Tools
*   **Debug DB (`/admin/debug-db`)**: Direct view of raw database tables for troubleshooting (Admin only).
*   **Email Testing**: Tools to verify transactional email delivery (Resend/Postmark).
