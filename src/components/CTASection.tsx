import { ArrowRight, Calendar, Users } from 'lucide-react';
import { Button } from './ui/button';

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-slate-900" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-orange-200/20 bg-orange-500/10 text-orange-300 mb-8">
            <span className="mr-2">🚀</span>
            Ready to Transform Your Placements?
          </div>
          
          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Ready to Transform Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              College Placements?
            </span>
          </h2>
          
          {/* Subtext */}
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join 50+ colleges already using VolkaiHR EDU to prepare students for successful careers. 
            Get your first 50 students onboarded for free.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg">
              <Calendar className="mr-2 h-5 w-5" />
              Schedule a Free Demo Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg">
              <Users className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
          </div>
          
          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold mb-2">Quick Setup</h3>
              <p className="text-gray-400 text-sm">Get started in under 10 minutes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold mb-2">Proven Results</h3>
              <p className="text-gray-400 text-sm">85% average placement rate</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="font-semibold mb-2">Risk-Free</h3>
              <p className="text-gray-400 text-sm">30-day money-back guarantee</p>
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-gray-400 mb-4">Join these leading institutions</p>
            <div className="flex items-center justify-center space-x-8 flex-wrap gap-4">
              {['IIT Delhi', 'BITS Pilani', 'NIT Trichy', 'VIT University', 'SRM Institute'].map((college) => (
                <div key={college} className="text-gray-300 font-medium text-sm opacity-60 hover:opacity-100 transition-opacity">
                  {college}
                </div>
              ))}
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Have questions? Call us at{' '}
              <a href="tel:+918888888888" className="text-orange-400 hover:text-orange-300">
                +91 88888 88888
              </a>{' '}
              or{' '}
              <a href="mailto:hello@volkaihr.com" className="text-orange-400 hover:text-orange-300">
                hello@volkaihr.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}