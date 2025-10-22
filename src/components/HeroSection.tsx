import { Button } from './ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeroSectionProps {
  onGetStarted?: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 py-20 sm:py-24 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-orange-200 bg-orange-50 text-orange-700 mb-6">
              <span className="mr-2">🚀</span>
              AI-Powered Career Readiness Platform
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Empower Your Students with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                AI-Powered Career Readiness
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              From resumes to interviews, help your students practice, prepare, and perform with AI tools tailored for placements.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
                onClick={onGetStarted}
              >
                Book a Free Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 px-8 py-3">
                <Play className="mr-2 h-5 w-5" />
                See Student Dashboard
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">Trusted by 50+ colleges</p>
              <div className="flex items-center justify-center lg:justify-start space-x-8 opacity-60">
                {['IIT Delhi', 'BITS Pilani', 'NIT Trichy', 'VIT University'].map((college) => (
                  <div key={college} className="text-sm font-medium text-foreground">
                    {college}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1709377338719-8e613fe31425?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBSSUyMGVkdWNhdGlvbiUyMHRlY2hub2xvZ3klMjBzdHVkZW50c3xlbnwxfHx8fDE3NTY5MjE3ODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="AI Education Technology"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-orange-500 rounded-full blur-xl opacity-70 animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-blue-500 rounded-full blur-xl opacity-70 animate-pulse delay-1000" />
            
            {/* Stats Cards */}
            <div className="absolute -bottom-6 -left-6 bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="text-2xl font-bold text-orange-500">80%+</div>
              <div className="text-sm text-muted-foreground">Placement Rate</div>
            </div>
            <div className="absolute -top-6 -right-6 bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="text-2xl font-bold text-blue-500">5000+</div>
              <div className="text-sm text-muted-foreground">Students Ready</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}