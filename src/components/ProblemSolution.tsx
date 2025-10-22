import { AlertTriangle, CheckCircle, Users, FileText, MessageSquare, BarChart } from 'lucide-react';

export function ProblemSolution() {
  const problems = [
    {
      icon: FileText,
      title: "Students lack resume-building skills",
      description: "Generic templates don't stand out to recruiters"
    },
    {
      icon: MessageSquare,
      title: "Limited mock interview practice",
      description: "Students feel unprepared for real interviews"
    },
    {
      icon: Users,
      title: "Manual progress tracking",
      description: "Placement teams spend hours on administrative tasks"
    }
  ];

  const solutions = [
    {
      icon: CheckCircle,
      title: "AI Resume Builder",
      description: "ATS-friendly templates with smart suggestions",
      color: "text-green-500"
    },
    {
      icon: CheckCircle,
      title: "AI Mock Interviews",
      description: "Real-time feedback with role-specific simulations",
      color: "text-green-500"
    },
    {
      icon: BarChart,
      title: "Centralized Dashboard",
      description: "Automated tracking with WhatsApp & Email reminders",
      color: "text-green-500"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            From Challenges to Solutions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how we transform common placement challenges into opportunities for student success
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Problems Side */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Why Colleges Struggle with Placements?
              </h3>
            </div>
            
            <div className="space-y-6">
              {problems.map((problem, index) => (
                <div key={index} className="flex items-start space-x-4 p-6 bg-card rounded-xl border border-border shadow-sm">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <problem.icon className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">{problem.title}</h4>
                    <p className="text-muted-foreground text-sm">{problem.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions Side */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                How We Solve It
              </h3>
            </div>
            
            <div className="space-y-6">
              {solutions.map((solution, index) => (
                <div key={index} className="flex items-start space-x-4 p-6 bg-card rounded-xl border border-green-200 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-transparent opacity-50" />
                  <div className="flex-shrink-0 relative z-10">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <solution.icon className={`h-5 w-5 ${solution.color}`} />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-semibold text-foreground mb-2">{solution.title}</h4>
                    <p className="text-muted-foreground text-sm">{solution.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow or VS indicator */}
        <div className="flex justify-center my-12 lg:hidden">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">VS</span>
          </div>
        </div>
      </div>
    </section>
  );
}