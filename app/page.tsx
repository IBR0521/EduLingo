import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, GraduationCap, MessageSquare, Sparkles, TrendingUp, Shield, Clock } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="text-lg font-semibold">English Course Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl"></div>
              <div className="relative rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-6 shadow-lg">
                <GraduationCap className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Comprehensive Learning Management System</span>
          </div>
          <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Transform Your English
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> Learning Experience</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl animate-in fade-in slide-in-from-bottom-6 text-pretty text-lg text-muted-foreground leading-relaxed">
            A comprehensive learning management system for English courses. Manage classes, track progress, assign
            homework, and communicate seamlessly with students, teachers, and parents.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8">
            <Button asChild size="lg" className="text-base shadow-lg hover:shadow-xl transition-shadow">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base border-2 hover:bg-accent transition-colors">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-32 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Course Management</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize classes, assign homework, and track upcoming lessons efficiently.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Student Progress</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Monitor grades, attendance, and participation with detailed analytics.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tailored dashboards for main teachers, teachers, students, and parents.
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="relative">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Communication</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built-in messaging and notifications to keep everyone connected.
              </p>
            </div>
          </div>
        </div>

        {/* User Types Section */}
        <div className="mt-32">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Who Can Use This Platform?</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Designed for everyone involved in the learning process
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Main Teacher</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Full control over all groups, teachers, and students. Assign teachers to groups and oversee everything.
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Teacher</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Manage assigned groups, mark attendance, grade assignments, and track student progress.
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Student</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  View grades, upcoming classes, homework, and communicate with teachers.
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Parent</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monitor your child's progress, grades, attendance, and stay informed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 mx-auto max-w-2xl text-muted-foreground">
            Join thousands of educators and students already using our platform
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base shadow-lg">
              <Link href="/register">Create Free Account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
