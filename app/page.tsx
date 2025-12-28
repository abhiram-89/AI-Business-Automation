import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Zap, Shield, Brain } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold">AutomateAI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
            <Button asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary border border-primary/20">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Automation Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            Automate your business with <span className="text-primary">AI agents</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Transform repetitive tasks into automated workflows. Our AI agents understand plain English, select the
            right tools, and execute multi-step processes seamlessly.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild className="gap-2">
              <Link href="/dashboard">
                Start Automating
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground leading-relaxed">
              Process tasks in seconds. Our AI agents work 24/7 to automate your workflows and boost productivity.
            </p>
          </div>

          <div className="p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Intelligent Agents</h3>
            <p className="text-muted-foreground leading-relaxed">
              Understands natural language and automatically selects the right tools for your specific tasks.
            </p>
          </div>

          <div className="p-8 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              Bank-level encryption and compliance standards ensure your data stays secure and private.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6 p-12 rounded-2xl bg-card border border-border">
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Ready to automate your business?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of businesses using AI to save time and increase efficiency.
          </p>
          <Button size="lg" asChild className="gap-2">
            <Link href="/dashboard">
              Get Started for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
