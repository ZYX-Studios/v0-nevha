import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Users,
  MessageSquare,
  Shield,
  Car,
  Calendar,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"

async function getRecentAnnouncements() {
  const supabase = await createClient()

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3)

  return announcements || []
}

export default async function HomePage() {
  const announcements = await getRecentAnnouncements()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary rounded-lg p-2">
                <Home className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Northfields</h1>
                <p className="text-sm text-muted-foreground">Homeowners Association</p>
              </div>
            </div>
            <Link href="/auth/login">
              <Button variant="default" size="sm">
                Resident Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            Community Management Platform
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            Welcome to Northfields Community
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-pretty">
            Your central hub for community announcements, issue reporting, and staying connected with your neighbors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="w-full sm:w-auto">
                Access Portal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#announcements">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
                View Announcements
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="announcements" className="py-16 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Latest Announcements</h3>
            <p className="text-lg text-muted-foreground">
              Stay informed with the latest community updates and important notices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div
                        className={`rounded-lg p-2 w-fit ${
                          announcement.priority === "high"
                            ? "bg-destructive/10"
                            : announcement.priority === "medium"
                              ? "bg-secondary/10"
                              : "bg-primary/10"
                        }`}
                      >
                        {announcement.priority === "high" ? (
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              announcement.priority === "high"
                                ? "text-destructive"
                                : announcement.priority === "medium"
                                  ? "text-secondary"
                                  : "text-primary"
                            }`}
                          />
                        ) : (
                          <MessageSquare
                            className={`h-5 w-5 ${
                              announcement.priority === "high"
                                ? "text-destructive"
                                : announcement.priority === "medium"
                                  ? "text-secondary"
                                  : "text-primary"
                            }`}
                          />
                        )}
                      </div>
                      <Badge
                        variant={
                          announcement.priority === "high"
                            ? "destructive"
                            : announcement.priority === "medium"
                              ? "secondary"
                              : "default"
                        }
                        className="text-xs"
                      >
                        {announcement.priority}
                      </Badge>
                    </div>
                    <CardTitle className="text-foreground text-lg">{announcement.title}</CardTitle>
                    <CardDescription className="text-muted-foreground line-clamp-3">
                      {announcement.content}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No announcements available at this time.</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <Link href="/announcements">
              <Button variant="outline">
                View All Announcements
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">Report an Issue</CardTitle>
              <CardDescription className="text-muted-foreground">
                Help us maintain our community by reporting maintenance issues or concerns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-muted/30">
                  <div className="bg-destructive/10 rounded-full p-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-foreground mb-2">Emergency Issues</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      For urgent matters requiring immediate attention
                    </p>
                    <Button variant="destructive" size="sm">
                      Report Emergency
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-muted/30">
                  <div className="bg-primary/10 rounded-full p-4">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-foreground mb-2">General Issues</h4>
                    <p className="text-sm text-muted-foreground mb-4">Non-urgent maintenance and community concerns</p>
                    <Link href="/report-issue">
                      <Button variant="outline" size="sm">
                        Submit Report
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">Community Services</h3>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage your community life in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 rounded-lg p-3 w-fit">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Announcements</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Stay informed with important community updates and news
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="bg-secondary/10 rounded-lg p-3 w-fit">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-foreground">Issue Reporting</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Report maintenance issues and track their resolution status
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 rounded-lg p-3 w-fit">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Parking Management</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage parking stickers and vehicle registrations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="bg-secondary/10 rounded-lg p-3 w-fit">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-foreground">Community Directory</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Connect with neighbors and access contact information
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="bg-primary/10 rounded-lg p-3 w-fit">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Events & Meetings</CardTitle>
                <CardDescription className="text-muted-foreground">
                  View upcoming community events and HOA meetings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm bg-card backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="bg-secondary/10 rounded-lg p-3 w-fit">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-foreground">Secure Access</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Role-based access ensures information security and privacy
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">Contact Management</CardTitle>
              <CardDescription className="text-muted-foreground">
                Our management team is here to assist you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-primary/10 rounded-full p-3">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">(555) 123-4567</p>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-secondary/10 rounded-full p-3">
                    <Mail className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">info@northfields.com</p>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-primary/10 rounded-full p-3">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Office</p>
                    <p className="text-sm text-muted-foreground">123 Northfields Dr</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Northfields Homeowners Association</span>
          </div>
          <p className="text-primary-foreground/80 text-sm">
            © 2024 Northfields Homeowners Association. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
