import { TrendingUp, Clock, Users, CheckCircle } from 'lucide-react';

export function BenefitsSection() {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Boost Placement Readiness",
      stat: "80%+",
      description: "students improve interview scores in 2 weeks",
      detail: "Our AI-powered mock interviews and feedback system helps students gain confidence and skills rapidly",
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50"
    },
    {
      icon: Clock,
      title: "Save Faculty Time",
      stat: "50+ hours",
      description: "cut from manual prep work each semester",
      detail: "Automated tools handle repetitive tasks, letting educators focus on strategic guidance",
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50"
    },
    {
      icon: Users,
      title: "Scalable for Every Student",
      stat: "50 to 5000+",
      description: "students managed seamlessly",
      detail: "From small colleges to large universities, our platform grows with your institution",
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50"
    }
  ];

  const additionalBenefits = [
    "Real-time progress tracking and analytics",
    "Automated WhatsApp and email reminders",
    "ATS-friendly resume templates",
    "Industry-specific interview simulations",
    "Comprehensive placement reports",
    "24/7 student access to preparation tools"
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-green-200 bg-green-50 text-green-700 mb-6">
            <span className="mr-2">📈</span>
            Proven Results
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Benefits for Your College
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join 50+ colleges already transforming their placement programs with measurable results
          </p>
        </div>

        {/* Main Benefits Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <div key={index} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${benefit.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative p-8 bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {/* Icon */}
                <div className="mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${benefit.gradient} rounded-xl shadow-lg`}>
                    <benefit.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">{benefit.title}</h3>
                  
                  {/* Stat */}
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-4xl font-bold bg-gradient-to-r ${benefit.gradient} bg-clip-text text-transparent`}>
                      {benefit.stat}
                    </span>
                    <span className="text-muted-foreground">{benefit.description}</span>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Benefits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Why Colleges Choose VolkaiHR EDU
            </h3>
            <div className="space-y-4">
              {additionalBenefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Success Story */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">IIT</span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">IIT Delhi</h4>
                  <p className="text-sm text-muted-foreground">Computer Science Department</p>
                </div>
              </div>
              
              <blockquote className="text-muted-foreground italic mb-4">
                "VolkaiHR EDU helped us increase our placement rate by 35% in just one semester. 
                The AI mock interviews gave our students the confidence they needed."
              </blockquote>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">— Dr. Priya Sharma, TPO</span>
                <div className="flex space-x-4">
                  <div className="text-center">
                    <div className="font-bold text-green-500">95%</div>
                    <div className="text-xs text-muted-foreground">Placement Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-500">500+</div>
                    <div className="text-xs text-muted-foreground">Students</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500 mb-2">50+</div>
            <div className="text-muted-foreground">Partner Colleges</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">10,000+</div>
            <div className="text-muted-foreground">Students Trained</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">85%</div>
            <div className="text-muted-foreground">Avg Placement Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">98%</div>
            <div className="text-muted-foreground">Student Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}