// Demo data generator for showcasing the HOA PWA

import type { Announcement, Issue, User, Homeowner, CarSticker } from "./types"

export class DemoDataGenerator {
  // Generate realistic demo announcements
  static generateAnnouncements(count = 10): Announcement[] {
    const announcementTemplates = [
      {
        title: "Pool Season Opening",
        content:
          "The community pool will officially open for the season on May 1st. Pool hours are 6 AM to 10 PM daily. Please remember to follow all posted safety rules and supervise children at all times.",
        priority: "normal" as const,
      },
      {
        title: "Landscaping Improvements",
        content:
          "We are excited to announce new landscaping improvements throughout the community. Work will begin next Monday and is expected to complete within two weeks. Thank you for your patience during this enhancement project.",
        priority: "normal" as const,
      },
      {
        title: "Emergency Maintenance Notice",
        content:
          "Emergency water line repairs will require a temporary water shutdown tomorrow from 9 AM to 2 PM. Please plan accordingly and store water as needed. We apologize for the inconvenience.",
        priority: "urgent" as const,
      },
      {
        title: "Community BBQ Event",
        content:
          "Join us for our annual community BBQ on Saturday, June 15th from 12 PM to 4 PM at the community center. Food, drinks, and entertainment will be provided. RSVP by June 10th.",
        priority: "normal" as const,
      },
      {
        title: "Parking Policy Update",
        content:
          "Effective immediately, all vehicles must display current parking permits. Visitor parking is limited to 48 hours. Please contact the office for guest parking passes.",
        priority: "high" as const,
      },
      {
        title: "Holiday Office Hours",
        content:
          "The HOA office will be closed on Memorial Day, Monday May 27th. For emergencies, please call the after-hours number. Normal business hours resume Tuesday.",
        priority: "normal" as const,
      },
      {
        title: "Fitness Center Renovation",
        content:
          "The community fitness center will be closed for renovations from July 1-15. New equipment and updated facilities will be available when we reopen. Thank you for your patience.",
        priority: "high" as const,
      },
      {
        title: "Pet Policy Reminder",
        content:
          "Please remember that all pets must be leashed in common areas and owners are responsible for cleaning up after their pets. Maximum of two pets per household.",
        priority: "low" as const,
      },
    ]

    return Array.from({ length: count }, (_, index) => {
      const template = announcementTemplates[index % announcementTemplates.length]
      const daysAgo = Math.floor(Math.random() * 30)
      const publishDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

      return {
        id: `demo-announcement-${index + 1}`,
        title: template.title,
        content: template.content,
        authorId: "demo-admin-1",
        priority: template.priority,
        isPublished: Math.random() > 0.2, // 80% published
        publishDate: publishDate.toISOString(),
        expiryDate: Math.random() > 0.7 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        createdAt: publishDate.toISOString(),
        updatedAt: publishDate.toISOString(),
      }
    })
  }

  // Generate realistic demo issues
  static generateIssues(count = 15): Issue[] {
    const issueTemplates = [
      {
        title: "Broken Streetlight",
        description:
          "The streetlight near the main entrance is not working properly. It flickers on and off throughout the night.",
        category: "Maintenance",
        priority: "P3" as const,
        location: "Main entrance area",
      },
      {
        title: "Pool Filter Malfunction",
        description:
          "The pool filter system is making unusual noises and the water clarity has decreased significantly.",
        category: "Maintenance",
        priority: "P2" as const,
        location: "Community pool",
      },
      {
        title: "Noise Complaint",
        description: "Loud music and parties from unit B-12 during late night hours, violating quiet time policies.",
        category: "Noise",
        priority: "P3" as const,
        location: "Building B, Unit 12",
      },
      {
        title: "Playground Safety Issue",
        description: "One of the swings has a broken chain that could be dangerous for children.",
        category: "Safety",
        priority: "P1" as const,
        location: "Children's playground",
      },
      {
        title: "Parking Lot Pothole",
        description: "Large pothole has formed in the main parking lot that could damage vehicles.",
        category: "Maintenance",
        priority: "P3" as const,
        location: "Main parking lot, section C",
      },
      {
        title: "Mailbox Lock Broken",
        description: "The lock on mailbox cluster #3 is jammed and residents cannot access their mail.",
        category: "Maintenance",
        priority: "P2" as const,
        location: "Mailbox cluster #3",
      },
      {
        title: "Landscaping Overgrowth",
        description: "Bushes and trees along the walking path have grown too large and are blocking the walkway.",
        category: "Landscaping",
        priority: "P4" as const,
        location: "Main walking path",
      },
      {
        title: "Gym Equipment Malfunction",
        description: "The treadmill in the fitness center is making grinding noises and the belt is slipping.",
        category: "Maintenance",
        priority: "P3" as const,
        location: "Community fitness center",
      },
    ]

    const statuses: Issue["status"][] = ["not_started", "in_progress", "resolved", "closed"]

    return Array.from({ length: count }, (_, index) => {
      const template = issueTemplates[index % issueTemplates.length]
      const daysAgo = Math.floor(Math.random() * 45)
      const createdDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      let resolvedAt: string | undefined
      let resolutionNotes: string | undefined

      if (status === "resolved" || status === "closed") {
        const resolvedDaysAgo = Math.floor(Math.random() * daysAgo)
        resolvedAt = new Date(Date.now() - resolvedDaysAgo * 24 * 60 * 60 * 1000).toISOString()
        resolutionNotes = "Issue has been resolved by the maintenance team."
      }

      return {
        id: `demo-issue-${index + 1}`,
        reporterId: `demo-resident-${Math.floor(Math.random() * 5) + 1}`,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        status,
        location: template.location,
        assignedTo: status !== "not_started" ? "demo-staff-1" : undefined,
        resolutionNotes,
        resolvedAt,
        createdAt: createdDate.toISOString(),
        updatedAt: resolvedAt || createdDate.toISOString(),
      }
    })
  }

  // Generate demo users
  static generateUsers(count = 20): User[] {
    const firstNames = ["John", "Jane", "Michael", "Sarah", "David", "Lisa", "Robert", "Emily", "James", "Ashley"]
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
    ]

    return Array.from({ length: count }, (_, index) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`

      return {
        id: `demo-user-${index + 1}`,
        email,
        firstName,
        lastName,
        phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
        role: index < 2 ? "admin" : index < 4 ? "staff" : "homeowner",
        isActive: Math.random() > 0.05, // 95% active
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  // Generate demo homeowners
  static generateHomeowners(users: User[]): Homeowner[] {
    const streets = ["Oak Street", "Pine Avenue", "Maple Drive", "Elm Court", "Birch Lane", "Cedar Way"]
    const buildings = ["A", "B", "C", "D", "E", "F"]

    return users
      .filter((user) => user.role === "homeowner")
      .map((user, index) => {
        const street = streets[Math.floor(Math.random() * streets.length)]
        const building = buildings[Math.floor(Math.random() * buildings.length)]
        const unitNumber = `${building}${Math.floor(Math.random() * 20) + 1}`

        return {
          id: `demo-homeowner-${index + 1}`,
          userId: user.id,
          propertyAddress: `${Math.floor(Math.random() * 999) + 100} ${street}`,
          unitNumber,
          moveInDate: new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          isOwner: Math.random() > 0.2, // 80% owners
          emergencyContactName: `Emergency Contact ${index + 1}`,
          emergencyContactPhone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
          notes: Math.random() > 0.7 ? "Demo resident with special notes" : undefined,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      })
  }

  // Generate demo car stickers
  static generateCarStickers(homeowners: Homeowner[]): CarSticker[] {
    const makes = ["Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes", "Audi", "Subaru", "Mazda"]
    const models = ["Camry", "Civic", "F-150", "Malibu", "Altima", "3 Series", "C-Class", "A4", "Outback", "CX-5"]
    const colors = ["White", "Black", "Silver", "Gray", "Red", "Blue", "Green", "Brown"]

    const stickers: CarSticker[] = []
    let stickerNumber = 1

    homeowners.forEach((homeowner, homeownerIndex) => {
      // Each homeowner has 1-2 vehicles
      const vehicleCount = Math.random() > 0.6 ? 2 : 1

      for (let i = 0; i < vehicleCount; i++) {
        const make = makes[Math.floor(Math.random() * makes.length)]
        const model = models[Math.floor(Math.random() * models.length)]
        const color = colors[Math.floor(Math.random() * colors.length)]
        const year = 2018 + Math.floor(Math.random() * 7) // 2018-2024

        stickers.push({
          id: `demo-sticker-${stickerNumber}`,
          homeownerId: homeowner.id,
          stickerNumber: `HOA${String(stickerNumber).padStart(3, "0")}`,
          vehicleMake: make,
          vehicleModel: model,
          vehicleYear: year,
          vehicleColor: color,
          licensePlate: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 1000)}`,
          issueDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          isActive: Math.random() > 0.1, // 90% active
          createdAt: homeowner.createdAt,
          updatedAt: homeowner.updatedAt,
        })

        stickerNumber++
      }
    })

    return stickers
  }

  // Generate complete demo dataset
  static generateCompleteDataset() {
    const users = this.generateUsers(25)
    const homeowners = this.generateHomeowners(users)
    const carStickers = this.generateCarStickers(homeowners)
    const announcements = this.generateAnnouncements(12)
    const issues = this.generateIssues(20)

    return {
      users,
      homeowners,
      carStickers,
      announcements,
      issues,
    }
  }
}

// Export for use in development
export default DemoDataGenerator
