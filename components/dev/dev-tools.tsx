// Development tools component for testing and debugging

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useOffline } from "@/hooks/use-offline"
import { TEST_CREDENTIALS, devUtils, DemoDataGenerator } from "@/lib/test-utils"
import { mockUsers, mockAnnouncements, mockIssues } from "@/lib/mock-data"
import { Settings, User, Database, Wifi, RefreshCw, Trash2, Download, Upload } from "lucide-react"

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const { session, login, logout } = useAuth()
  const { isOnline, syncData, getOfflineData, saveOfflineData } = useOffline()

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null
  }

  const handleQuickLogin = async (userType: keyof typeof TEST_CREDENTIALS) => {
    const credentials = TEST_CREDENTIALS[userType]
    await login(credentials.email, credentials.password)
  }

  const handleGenerateDemoData = () => {
    const demoData = DemoDataGenerator.generateCompleteDataset()
    console.log("[Dev Tools] Generated demo data:", demoData)

    // Save to offline storage for testing
    saveOfflineData({
      announcements: demoData.announcements,
      issues: demoData.issues,
      userProfile: session.user,
    })
  }

  const handleExportData = () => {
    const data = {
      session: session,
      offlineData: getOfflineData(),
      mockData: {
        users: mockUsers,
        announcements: mockAnnouncements,
        issues: mockIssues,
      },
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hoa-app-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
          className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
        >
          <Settings className="h-4 w-4 mr-2" />
          Dev Tools
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Development Tools</span>
              </CardTitle>
              <CardDescription>Testing and debugging utilities for the HOA PWA</CardDescription>
            </div>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="auth" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="data">Data Management</TabsTrigger>
              <TabsTrigger value="offline">Offline/PWA</TabsTrigger>
              <TabsTrigger value="debug">Debug Info</TabsTrigger>
            </TabsList>

            <TabsContent value="auth" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current Session</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {session.isAuthenticated ? (
                      <div className="space-y-2">
                        <p>
                          <strong>User:</strong> {session.user?.firstName} {session.user?.lastName}
                        </p>
                        <p>
                          <strong>Email:</strong> {session.user?.email}
                        </p>
                        <Badge variant="outline">{session.user?.role}</Badge>
                        <Button onClick={logout} variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Not authenticated</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Login</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={() => handleQuickLogin("admin")} variant="outline" size="sm" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Login as Admin
                    </Button>
                    <Button onClick={() => handleQuickLogin("staff")} variant="outline" size="sm" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Login as Staff
                    </Button>
                    <Button
                      onClick={() => handleQuickLogin("homeowner")}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Login as Homeowner
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Generation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      onClick={handleGenerateDemoData}
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Generate Demo Data
                    </Button>
                    <Button
                      onClick={devUtils.populateTestData}
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Populate Test Data
                    </Button>
                    <Button onClick={handleExportData} variant="outline" size="sm" className="w-full bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Export All Data
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={devUtils.clearAllData} variant="destructive" size="sm" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This will clear all local storage data including auth sessions and offline data.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="offline" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Connection Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Wifi className={`h-4 w-4 ${isOnline ? "text-green-600" : "text-red-600"}`} />
                      <Badge variant={isOnline ? "default" : "destructive"}>{isOnline ? "Online" : "Offline"}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">PWA Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      onClick={syncData}
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      disabled={!isOnline}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Data
                    </Button>
                    <Button
                      onClick={() => {
                        if ("serviceWorker" in navigator) {
                          navigator.serviceWorker.getRegistrations().then((registrations) => {
                            registrations.forEach((registration) => registration.unregister())
                            window.location.reload()
                          })
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Reset Service Worker
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="debug" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={devUtils.logAppState} variant="outline" size="sm" className="mb-4 bg-transparent">
                    Log App State to Console
                  </Button>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Environment:</strong> {process.env.NODE_ENV}
                    </p>
                    <p>
                      <strong>User Agent:</strong> {typeof window !== "undefined" ? navigator.userAgent : "N/A"}
                    </p>
                    <p>
                      <strong>Screen Size:</strong>{" "}
                      {typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A"}
                    </p>
                    <p>
                      <strong>PWA Support:</strong> {"serviceWorker" in navigator ? "Yes" : "No"}
                    </p>
                    <p>
                      <strong>Local Storage:</strong> {typeof Storage !== "undefined" ? "Available" : "Not Available"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
