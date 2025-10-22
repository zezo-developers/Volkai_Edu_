import { Upload, FileText, MessageCircle, BarChart3, TrendingUp, Bell } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: Upload,
      title: "Bulk Student Import",
      description: "Upload Excel/CSV files and onboard hundreds of students in minutes",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      icon: FileText,
      title: "AI Resume Builder",
      description: "Smart, job-ready resumes with ATS-friendly templates and AI suggestions",
      gradient: "from-green-500 to-green-600"
    },
    {
      icon: MessageCircle,
      title: "Mock Interviews",
      description: "Role-specific AI simulations with real-time scoring and detailed feedback",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      icon: BarChart3,
      title: "Instructor Dashboard",
      description: "Assign tasks, track student progress, and generate comprehensive reports",
      gradient: "from-orange-500 to-orange-600"
    },
    {
      icon: TrendingUp,
      title: "Performance Analytics",
      description: "Placement readiness scores with detailed analytics and improvement insights",
      gradient: "from-pink-500 to-pink-600"
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Automated WhatsApp & Email reminders keep students engaged and on track",
      gradient: "from-cyan-500 to-cyan-600"
    }
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-orange-200 bg-orange-50 text-orange-700 mb-6">
            <span className="mr-2">⚡</span>
            Powerful Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need for Student Success
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive platform provides all the tools colleges need to prepare students for successful career placements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group relative">
              <div className="relative p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className="relative z-10 mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl shadow-lg`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-orange-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Hover Effect Border */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`} />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <span>🎯</span>
            <span>All features included in every plan</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
              Try All Features Free
            </button>
            <button className="px-6 py-3 bg-transparent border border-border hover:bg-muted text-foreground rounded-lg font-medium transition-colors">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}