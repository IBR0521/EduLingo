"use client"

import { useState, useEffect } from "react"
import type { User, Message } from "@/lib/types"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Inbox, Send as Sent, Plus, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { toast } from "sonner"

interface MessagesPageProps {
  user: User
}

interface MessageWithUsers extends Message {
  sender?: User
  recipient?: User
}

export function MessagesPage({ user }: MessagesPageProps) {
  const [view, setView] = useState<"inbox" | "sent">("inbox")
  const [messages, setMessages] = useState<MessageWithUsers[]>([])
  const [selectedMessage, setSelectedMessage] = useState<MessageWithUsers | null>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    recipient_id: "",
    subject: "",
    content: "",
  })

  useEffect(() => {
    loadMessages()
    loadUsers()
    // Clear selected message when switching views
    setSelectedMessage(null)
  }, [view, user.id])

  const loadMessages = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      if (view === "inbox") {
        // Load messages where current user is the recipient
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error loading inbox messages:", error)
          setMessages([])
          setLoading(false)
          return
        }

        console.log(`📥 Loaded ${data?.length || 0} inbox messages`)
        
        // Load sender details separately
        if (data && data.length > 0) {
          const senderIds = [...new Set(data.map(msg => msg.sender_id))]
          const { data: senders } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", senderIds)
          
          const messagesWithSenders = data.map(msg => ({
            ...msg,
            sender: senders?.find(s => s.id === msg.sender_id),
          }))
          
          setMessages(messagesWithSenders)
        } else {
          setMessages([])
        }
      } else {
        // Load messages where current user is the sender
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error loading sent messages:", error)
          setMessages([])
          setLoading(false)
          return
        }

        console.log(`📤 Loaded ${data?.length || 0} sent messages`)
        
        // Load recipient details separately
        if (data && data.length > 0) {
          const recipientIds = [...new Set(data.map(msg => msg.recipient_id))]
          const { data: recipients } = await supabase
            .from("users")
            .select("id, full_name, email")
            .in("id", recipientIds)
          
          const messagesWithRecipients = data.map(msg => ({
            ...msg,
            recipient: recipients?.find(r => r.id === msg.recipient_id),
          }))
          
          setMessages(messagesWithRecipients)
        } else {
          setMessages([])
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("users").select("*").neq("id", user.id).order("full_name")

    if (data) {
      setUsers(data)
    }
  }

  const handleSendMessage = async () => {
    console.log("handleSendMessage called", { formData, user: { id: user.id, name: user.full_name } })
    
    // Validate form
    if (!formData.recipient_id) {
      console.warn("Validation failed: No recipient selected")
      toast.error("Please select a recipient")
      return
    }

    if (!formData.content.trim() || formData.content.trim().length < 1) {
      console.warn("Validation failed: Empty message content")
      toast.error("Please enter a message")
      return
    }

    if (formData.content.length > 5000) {
      console.warn("Validation failed: Message too long")
      toast.error("Message is too long (max 5000 characters)")
      return
    }

    if (formData.subject && formData.subject.length > 200) {
      console.warn("Validation failed: Subject too long")
      toast.error("Subject is too long (max 200 characters)")
      return
    }

    if (!user?.id) {
      console.error("Error: User ID is missing")
      toast.error("Authentication error. Please refresh the page.")
      return
    }

    try {
      const supabase = createClient()
      const recipientId = formData.recipient_id // Save before clearing form
      
      console.log("Attempting to send message:", {
        sender_id: user.id,
        recipient_id: recipientId,
        subject: formData.subject || "(no subject)",
        content_length: formData.content.length,
      })
      
      // Insert message
      const { data: messageData, error: messageError } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        subject: formData.subject || null,
        content: formData.content,
      }).select().single()

      if (messageError) {
        console.error("Database error sending message:", {
          message: messageError.message,
          details: messageError.details,
          hint: messageError.hint,
          code: messageError.code,
        })
        toast.error("Failed to send message", {
          description: messageError.message || messageError.details || "Unknown database error",
        })
        return
      }

      if (!messageData) {
        console.error("Error: Message insert returned no data and no error")
        toast.error("Failed to send message", {
          description: "Message was not saved. Please try again.",
        })
        return
      }

      console.log("✅ Message sent successfully:", messageData)
      toast.success("Message sent successfully!")

      // Save form data before clearing (for notifications)
      const messageSubject = formData.subject
      const messageContent = formData.content

      // Clear form and close dialog
      setIsComposeOpen(false)
      setFormData({ recipient_id: "", subject: "", content: "" })
      
      // Reload messages to show the newly sent message
      await loadMessages()

      // Get recipient details for notifications (optional - don't block if not found)
      const selectedRecipient = users.find((u) => u.id === recipientId)
      
      // Create notification for recipient (silent failure - don't block message sending)
      if (selectedRecipient) {
        supabase
          .from("notifications")
          .insert({
            user_id: recipientId,
            title: "New Message",
            message: `You have a new message from ${user.full_name}`,
            type: "message",
          })
          .then(() => {
            // Notification created successfully (no logging needed)
          })
          .catch(() => {
            // Silently ignore notification creation errors
          })

          // Send push notification (silent failure - don't block message sending)
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: recipientId,
            title: "New Message",
            message: `You have a new message from ${user.full_name}`,
            action_url: "/dashboard/messages",
            priority: "normal",
          }),
        })
          .then(async (response) => {
            if (response.ok) {
              try {
                const data = await response.json()
                if (data?.sent > 0) {
                  console.log(`✅ Push notification sent to ${data.sent} device(s)`)
                }
              } catch {
                // Ignore JSON parse errors
              }
            }
          })
          .catch(() => {
            // Silently ignore push notification errors
          })

        // Send email and SMS notifications (silent failures - optional features)
        const platformUrl = window.location.origin
        const emailSubject = messageSubject || `New message from ${user.full_name}`

        // Send email notification (silent failure)
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: selectedRecipient.email,
            recipientName: selectedRecipient.full_name,
            senderName: user.full_name,
            subject: emailSubject,
            content: messageContent,
            platformUrl,
          }),
        }).catch(() => {
          // Silently ignore email errors
        })

        // Send SMS notification (silent failure)
        if (selectedRecipient.phone_number) {
          const smsMessage = emailSubject ? `${emailSubject}\n\n${messageContent}` : messageContent
          const smsText = smsMessage.length > 160 ? `${smsMessage.substring(0, 150)}...` : smsMessage
          
          fetch("/api/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumber: selectedRecipient.phone_number,
              message: smsText,
              senderName: user.full_name,
            }),
          }).catch(() => {
            // Silently ignore SMS errors
          })
        }
      }
    } catch (error: any) {
      console.error("Unexpected error in handleSendMessage:", error)
      toast.error("An unexpected error occurred", {
        description: error?.message || "Please try again",
      })
    }
  }

  const handleMarkAsRead = async (messageId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("messages").update({ is_read: true }).eq("id", messageId)
    
    if (!error) {
      // Update local state immediately for better UX
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === messageId ? { ...msg, is_read: true } : msg)),
      )
      // Also update selected message if it's the one being marked
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, is_read: true })
      }
      // Reload to ensure consistency
      await loadMessages()
    }
  }

  const handleSelectMessage = (message: MessageWithUsers) => {
    setSelectedMessage(message)
    if (view === "inbox" && !message.is_read) {
      handleMarkAsRead(message.id)
    }
  }

  const filteredMessages = messages.filter((message) => {
    if (!searchTerm.trim()) {
      return true // Show all messages if no search term
    }

    const searchLower = searchTerm.toLowerCase()
    const senderName = message.sender?.full_name.toLowerCase() || ""
    const recipientName = message.recipient?.full_name.toLowerCase() || ""
    const subject = message.subject?.toLowerCase() || ""
    const content = message.content.toLowerCase()

    return (
      senderName.includes(searchLower) ||
      recipientName.includes(searchLower) ||
      subject.includes(searchLower) ||
      content.includes(searchLower)
    )
  })

  const unreadCount = messages.filter((m) => !m.is_read && view === "inbox").length

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">Communicate with teachers, students, and parents</p>
          </div>
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>Send a message to another user</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">To</Label>
                  <Select
                    value={formData.recipient_id}
                    onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}
                  >
                    <SelectTrigger id="recipient">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Message subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    placeholder="Type your message here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }} 
                  disabled={!formData.recipient_id || !formData.content.trim()}
                  type="button"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Message List */}
          <div className="lg:col-span-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant={view === "inbox" ? "default" : "outline"}
                    onClick={() => {
                      setView("inbox")
                      setSelectedMessage(null) // Clear selection when switching
                      setSearchTerm("") // Clear search when switching views
                    }}
                    className="flex-1"
                  >
                    <Inbox className="mr-2 h-4 w-4" />
                    Inbox
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={view === "sent" ? "default" : "outline"}
                    onClick={() => {
                      setView("sent")
                      setSelectedMessage(null) // Clear selection when switching
                      setSearchTerm("") // Clear search when switching views
                    }}
                    className="flex-1"
                  >
                    <Sent className="mr-2 h-4 w-4" />
                    Sent
                  </Button>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {loading ? (
                    <div className="text-center py-12 px-4 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                      <p>Loading messages...</p>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="text-center py-12 px-4 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>
                        {searchTerm
                          ? "No messages found"
                          : view === "inbox"
                            ? "No messages in inbox"
                            : "No sent messages"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedMessage?.id === message.id ? "bg-muted" : ""
                          } ${view === "inbox" && !message.is_read ? "border-l-4 border-primary" : ""}`}
                          onClick={() => handleSelectMessage(message)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p
                              className={`font-medium truncate ${view === "inbox" && !message.is_read ? "font-bold" : ""}`}
                            >
                              {view === "inbox" ? message.sender?.full_name : message.recipient?.full_name}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(message.created_at), "MMM d")}
                            </span>
                          </div>
                          <p
                            className={`text-sm mb-1 truncate ${view === "inbox" && !message.is_read ? "font-semibold" : "text-muted-foreground"}`}
                          >
                            {message.subject || "(No subject)"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Message Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedMessage ? (
                  <div className="space-y-6">
                    <div className="space-y-4 pb-4 border-b">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{view === "inbox" ? "From" : "To"}</p>
                          <p className="font-medium">
                            {view === "inbox"
                              ? selectedMessage.sender?.full_name
                              : selectedMessage.recipient?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {view === "inbox" ? selectedMessage.sender?.email : selectedMessage.recipient?.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(selectedMessage.created_at), "PPp")}
                          </p>
                          {view === "inbox" && !selectedMessage.is_read && <Badge variant="secondary">Unread</Badge>}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Subject</p>
                        <p className="text-lg font-semibold">{selectedMessage.subject || "(No subject)"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Message</p>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap leading-relaxed">{selectedMessage.content}</p>
                      </div>
                    </div>
                    {view === "inbox" && (
                      <div className="pt-4 border-t">
                        <Button
                          onClick={() => {
                            setFormData({
                              recipient_id: selectedMessage.sender_id,
                              subject: `Re: ${selectedMessage.subject || "(No subject)"}`,
                              content: "",
                            })
                            setIsComposeOpen(true)
                          }}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Reply
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Select a message to view</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
