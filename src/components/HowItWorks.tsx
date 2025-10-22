import { UserPlus, Mail, PenTool, BarChart, Trophy, ArrowRight } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      step: 1,
      icon: UserPlus,
      title: "Add Students",
      description: "College uploads bulk student list via Excel/CSV",
      detail: "Import thousands of students in minutes with our smart bulk upload feature"
    },
    {
      step: 2,
      icon: Mail,
      title: "Invite Students",
      description: "Students receive email/WhatsApp access link automatically",
      detail: "Automated invitations with personalized onboarding instructions"
    },
    {
      step: 3,
      icon: PenTool,
      title: "Students Prepare",
      description: "Build resumes, practice mock interviews with AI feedback",
      detail: "Comprehensive preparation tools with AI-powered guidance"
    },
    {
      step: 4,
      icon: BarChart,
      title: "Track Progress",
      description: "TPOs and instructors monitor analytics and student performance",
      detail: "Real-time dashboards with detailed progress reports"
    },
    {
      step: 5,
      icon: Trophy,
      title: "Placement Ready",
      description: "Students enter job market fully prepared and confident",
      detail: "Certified career-ready students with verified skill assessments"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-blue-200 bg-blue-50 text-blue-700 mb-6">
            <span className="mr-2">🔄</span>
            Simple Process
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get your students placement-ready in 5 simple steps. From enrollment to job readiness in weeks, not months.
          </p>
        </div>

        {/* Desktop Timeline */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-blue-500 to-green-500 transform -translate-y-1/2" />
            
            <div className="grid grid-cols-5 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Step Circle */}
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg z-10 relative">
                        <step.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute -top-2 -left-2 w-20 h-20 border-2 border-orange-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full text-sm font-bold mb-4">
                      {step.step}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                    <p className="text-xs text-muted-foreground/80">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-6">
              {/* Step Icon and Line */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-16 bg-gradient-to-b from-orange-500 to-blue-500 mt-4" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-full text-xs font-bold mb-2">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground mb-2">{step.description}</p>
                <p className="text-sm text-muted-foreground/80">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-card rounded-xl border border-border">
            <div className="text-3xl font-bold text-orange-500 mb-2">2 weeks</div>
            <div className="text-muted-foreground">Average time to placement readiness</div>
          </div>
          <div className="text-center p-6 bg-card rounded-xl border border-border">
            <div className="text-3xl font-bold text-blue-500 mb-2">95%</div>
            <div className="text-muted-foreground">Student engagement rate</div>
          </div>
          <div className="text-center p-6 bg-card rounded-xl border border-border">
            <div className="text-3xl font-bold text-green-500 mb-2">50+ hrs</div>
            <div className="text-muted-foreground">Faculty time saved per semester</div>
          </div>
        </div>
      </div>
    </section>
  );
}