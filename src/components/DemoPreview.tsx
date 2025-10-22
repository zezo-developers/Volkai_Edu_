import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Monitor, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function DemoPreview() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const screenshots = [
    {
      title: "AI Mock Interview Interface",
      description: "Students practice with role-specific AI interviewers and receive instant feedback",
      image: "https://images.unsplash.com/photo-1559523182-a284c3fb7cff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxidXNpbmVzcyUyMGludGVydmlldyUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NTY4NjI5MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      tags: ["AI Interview", "Real-time Feedback", "Score Analysis"]
    },
    {
      title: "College Management Dashboard",
      description: "TPOs and instructors track student progress with comprehensive analytics",
      image: "https://images.unsplash.com/photo-1748609160056-7b95f30041f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBkYXNoYm9hcmQlMjBhbmFseXRpY3N8ZW58MXx8fHwxNzU2ODQ4MjY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      tags: ["Progress Tracking", "Analytics", "Bulk Management"]
    },
    {
      title: "AI Resume Builder",
      description: "Smart resume creation with ATS-friendly templates and AI suggestions",
      image: "https://images.unsplash.com/photo-1589872880544-76e896b0592c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMHRvZ2V0aGVyfGVufDF8fHx8MTc1NjkyMTc4NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      tags: ["ATS-Friendly", "Smart Templates", "AI Suggestions"]
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % screenshots.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-purple-200 bg-purple-50 text-purple-700 mb-6">
            <span className="mr-2">👁️</span>
            Live Demo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            See VolkaiHR EDU in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our intuitive interface designed for both students and college administrators
          </p>
        </div>

        {/* Demo Carousel */}
        <div className="relative max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
            {/* Browser Chrome */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center space-x-4 text-slate-400">
                <Monitor className="h-4 w-4" />
                <Smartphone className="h-4 w-4" />
              </div>
            </div>

            {/* Screenshot Content */}
            <div className="relative h-96 md:h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
              <ImageWithFallback
                src={screenshots[currentSlide].image}
                alt={screenshots[currentSlide].title}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white z-20">
                <div className="flex flex-wrap gap-2 mb-4">
                  {screenshots[currentSlide].tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-2xl font-bold mb-2">{screenshots[currentSlide].title}</h3>
                <p className="text-white/90 max-w-2xl">{screenshots[currentSlide].description}</p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all z-30"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all z-30"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center mt-6 space-x-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8">
              <Play className="mr-2 h-5 w-5" />
              Try Interactive Demo
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              Schedule Live Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No signup required • See results in 2 minutes
          </p>
        </div>
      </div>
    </section>
  );
}