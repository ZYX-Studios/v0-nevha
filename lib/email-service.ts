// Email notification service for department assignments and issue updates

export interface EmailNotification {
  to: string[]
  subject: string
  body: string
  issueId: string
  departmentId?: string
  type: 'assignment' | 'status_change' | 'comment' | 'escalation'
}

export interface IssueEmailData {
  issueId: string
  referenceCode: string
  title: string
  description: string
  priority: string
  status: string
  category: string
  location?: string
  reporterName: string
  reporterEmail?: string
  createdAt: string
  assignedDepartments?: string[]
}

export class EmailService {
  private static instance: EmailService
  private emailQueue: EmailNotification[] = []

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  // Generate email template for department assignment
  generateAssignmentEmail(issue: IssueEmailData, departmentName: string, departmentEmail: string): EmailNotification {
    const subject = `New Issue Assignment: ${issue.referenceCode} - ${issue.title}`
    
    const body = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .priority-urgent { color: #dc3545; font-weight: bold; }
        .priority-high { color: #fd7e14; font-weight: bold; }
        .priority-normal { color: #6c757d; }
        .priority-low { color: #28a745; }
        .issue-details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🏠 HOA Issue Assignment</h2>
            <p>A new issue has been assigned to the <strong>${departmentName}</strong> department.</p>
        </div>
        
        <div class="issue-details">
            <h3>Issue Details</h3>
            <p><strong>Reference Code:</strong> ${issue.referenceCode}</p>
            <p><strong>Title:</strong> ${issue.title}</p>
            <p><strong>Priority:</strong> <span class="priority-${issue.priority}">${issue.priority.toUpperCase()}</span></p>
            <p><strong>Category:</strong> ${issue.category}</p>
            <p><strong>Status:</strong> ${issue.status.replace('_', ' ').toUpperCase()}</p>
            ${issue.location ? `<p><strong>Location:</strong> ${issue.location}</p>` : ''}
            <p><strong>Reported by:</strong> ${issue.reporterName}</p>
            <p><strong>Reported on:</strong> ${new Date(issue.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div class="issue-details">
            <h4>Description</h4>
            <p>${issue.description}</p>
        </div>
        
        <div class="issue-details">
            <h4>Next Steps</h4>
            <ul>
                <li>Review the issue details above</li>
                <li>Assess the priority and urgency</li>
                <li>Assign appropriate staff members</li>
                <li>Update the issue status as work progresses</li>
                <li>Communicate with the reporter if needed</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the HOA Management System.</p>
            <p>Please do not reply to this email. For questions, contact the HOA administration.</p>
        </div>
    </div>
</body>
</html>
    `

    return {
      to: [departmentEmail],
      subject,
      body,
      issueId: issue.issueId,
      departmentId: departmentName,
      type: 'assignment'
    }
  }

  // Generate email template for status changes
  generateStatusChangeEmail(issue: IssueEmailData, oldStatus: string, newStatus: string, departmentEmails: string[]): EmailNotification {
    const subject = `Issue Status Update: ${issue.referenceCode} - ${oldStatus.replace('_', ' ')} → ${newStatus.replace('_', ' ')}`
    
    const body = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-change { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3; }
        .issue-details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📋 Issue Status Update</h2>
            <p>The status of issue <strong>${issue.referenceCode}</strong> has been updated.</p>
        </div>
        
        <div class="status-change">
            <h3>Status Change</h3>
            <p><strong>From:</strong> ${oldStatus.replace('_', ' ').toUpperCase()}</p>
            <p><strong>To:</strong> ${newStatus.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Updated on:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="issue-details">
            <h3>Issue Summary</h3>
            <p><strong>Title:</strong> ${issue.title}</p>
            <p><strong>Priority:</strong> ${issue.priority.toUpperCase()}</p>
            <p><strong>Category:</strong> ${issue.category}</p>
            <p><strong>Reporter:</strong> ${issue.reporterName}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the HOA Management System.</p>
            <p>Please do not reply to this email. For questions, contact the HOA administration.</p>
        </div>
    </div>
</body>
</html>
    `

    return {
      to: departmentEmails,
      subject,
      body,
      issueId: issue.issueId,
      type: 'status_change'
    }
  }

  // Generate email template for new comments
  generateCommentEmail(issue: IssueEmailData, comment: string, authorName: string, departmentEmails: string[]): EmailNotification {
    const subject = `New Comment on Issue: ${issue.referenceCode} - ${issue.title}`
    
    const body = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .comment { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107; }
        .issue-details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>💬 New Comment Added</h2>
            <p>A new comment has been added to issue <strong>${issue.referenceCode}</strong>.</p>
        </div>
        
        <div class="comment">
            <h3>Comment by ${authorName}</h3>
            <p>${comment}</p>
            <p><small>Posted on: ${new Date().toLocaleDateString()}</small></p>
        </div>
        
        <div class="issue-details">
            <h3>Issue Summary</h3>
            <p><strong>Title:</strong> ${issue.title}</p>
            <p><strong>Status:</strong> ${issue.status.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Priority:</strong> ${issue.priority.toUpperCase()}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the HOA Management System.</p>
            <p>Please do not reply to this email. For questions, contact the HOA administration.</p>
        </div>
    </div>
</body>
</html>
    `

    return {
      to: departmentEmails,
      subject,
      body,
      issueId: issue.issueId,
      type: 'comment'
    }
  }

  // Queue email for sending
  queueEmail(notification: EmailNotification): void {
    this.emailQueue.push(notification)
    console.log(`Email queued: ${notification.subject} to ${notification.to.join(', ')}`)
    
    // In a real implementation, this would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Resend
    // For now, we'll just log the email
    this.processEmailQueue()
  }

  // Process the email queue (mock implementation)
  private async processEmailQueue(): Promise<void> {
    while (this.emailQueue.length > 0) {
      const email = this.emailQueue.shift()
      if (email) {
        await this.sendEmail(email)
      }
    }
  }

  // Mock email sending (replace with actual email service integration)
  private async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      // Mock delay to simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('📧 EMAIL SENT:', {
        to: notification.to,
        subject: notification.subject,
        type: notification.type,
        issueId: notification.issueId
      })
      
      // In production, integrate with your email service:
      /*
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: notification.to,
          subject: notification.subject,
          html: notification.body,
          metadata: {
            issueId: notification.issueId,
            type: notification.type
          }
        })
      })
      */
      
    } catch (error) {
      console.error('Failed to send email:', error)
      // In production, implement retry logic and error handling
    }
  }

  // Get pending emails count
  getPendingEmailsCount(): number {
    return this.emailQueue.length
  }

  // Clear email queue (for testing)
  clearQueue(): void {
    this.emailQueue = []
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance()

// Helper function to send department assignment notification
export async function notifyDepartmentAssignment(
  issue: IssueEmailData, 
  departmentName: string, 
  departmentEmail: string
): Promise<void> {
  const notification = emailService.generateAssignmentEmail(issue, departmentName, departmentEmail)
  emailService.queueEmail(notification)
}

// Helper function to send status change notification
export async function notifyStatusChange(
  issue: IssueEmailData,
  oldStatus: string,
  newStatus: string,
  departmentEmails: string[]
): Promise<void> {
  if (departmentEmails.length > 0) {
    const notification = emailService.generateStatusChangeEmail(issue, oldStatus, newStatus, departmentEmails)
    emailService.queueEmail(notification)
  }
}

// Helper function to send comment notification
export async function notifyNewComment(
  issue: IssueEmailData,
  comment: string,
  authorName: string,
  departmentEmails: string[]
): Promise<void> {
  if (departmentEmails.length > 0) {
    const notification = emailService.generateCommentEmail(issue, comment, authorName, departmentEmails)
    emailService.queueEmail(notification)
  }
}
