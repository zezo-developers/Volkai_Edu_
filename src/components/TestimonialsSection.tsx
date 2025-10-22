import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';

export function TestimonialsSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      type: "TPO",
      name: "Dr. Rajesh Kumar",
      title: "Training & Placement Officer",
      institution: "IIT Bombay",
      institutionLogo: "IIT",
      quote: "VolkaiHR EDU transformed our placement process completely. We saw a 40% increase in job offers within the first semester. The AI mock interviews gave our students the confidence boost they needed.",
      rating: 5,
      stats: { placementRate: "92%", studentsPlaced: "450+" }
    },
    {
      type: "Student",
      name: "Priya Sharma",
      title: "Computer Science Graduate",
      institution: "NIT Delhi",
      institutionLogo: "NIT",
      quote: "The AI mock interviews were incredibly realistic. I practiced 20+ interviews before my actual placement, and it made all the difference. Got placed in Google with a 25 LPA package!",
      rating: 5,
      stats: { packageOffered: "25 LPA", interviewsPracticed: "20+" }
    },
    {
      type: "TPO",
      name: "Prof. Anita Desai",
      title: "Head of Placements",
      institution: "BITS Pilani",
      institutionLogo: "BITS",
      quote: "Managing 2000+ students was a nightmare before VolkaiHR EDU. Now everything is automated - from resume building to interview scheduling. Our team saves 60+ hours every week.",
      rating: 5,
      stats: { timeSaved: "60+ hrs/week", studentsManaged: "2000+" }
    },
    {
      type: "Student",
      name: "Arjun Patel",
      title: "Mechanical Engineering",
      institution: "VIT Chennai",
      institutionLogo: "VIT",
      quote: "The resume builder created an ATS-friendly resume that got me shortlisted in 15 companies. The AI suggestions were spot-on for my profile. Highly recommend to all students!",
      rating: 5,
      stats: { shortlisted: "15 companies", finalOffers: "5 offers" }
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTest = testimonials[currentTestimonial];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-blue-200 bg-blue-50 text-blue-700 mb-6">
            <span className="mr-2">💬</span>
            Success Stories
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            What Our Users Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real feedback from Training & Placement Officers and students who've transformed their careers
          </p>
        </div>

        {/* Main Testimonial */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-card rounded-2xl p-8 md:p-12 shadow-lg border border-border">
            {/* Quote Icon */}
            <div className="absolute -top-6 left-8">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Quote className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="pt-6">
              {/* Rating */}
              <div className="flex items-center justify-center mb-6">
                {[...Array(currentTest.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl md:text-2xl text-foreground text-center leading-relaxed mb-8 font-medium">
                "{currentTest.quote}"
              </blockquote>

              {/* Author Info */}
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {currentTest.institutionLogo}
                  </div>
                  <div className="text-center md:text-left">
                    <div className="font-semibold text-foreground text-lg">{currentTest.name}</div>
                    <div className="text-muted-foreground">{currentTest.title}</div>
                    <div className="text-sm text-orange-500 font-medium">{currentTest.institution}</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex space-x-6 text-center">
                  {Object.entries(currentTest.stats).map(([key, value], index) => (
                    <div key={index}>
                      <div className="text-2xl font-bold text-orange-500">{value}</div>
                      <div className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prevTestimonial}
                className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Indicators */}
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentTestimonial ? 'bg-orange-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextTestimonial}
                className="w-10 h-10 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {testimonials.filter((_, index) => index !== currentTestimonial).slice(0, 3).map((testimonial, index) => (
            <div key={index} className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {testimonial.institutionLogo}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.institution}</div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center mt-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-6">Trusted by leading institutions across India</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            {['IIT', 'NIT', 'BITS', 'VIT', 'SRM', 'KIIT'].map((college) => (
              <div key={college} className="text-2xl font-bold text-foreground">
                {college}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}