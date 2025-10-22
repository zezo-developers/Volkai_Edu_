import { useState } from 'react';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-semibold text-foreground">VolkaiHR EDU</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#features" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                Features
              </a>
              <a href="#how-it-works" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                How It Works
              </a>
              <a href="#pricing" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                Pricing
              </a>
              <a href="#students" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                For Students
              </a>
              <a href="#contact" className="text-foreground hover:text-orange-500 transition-colors px-3 py-2">
                Contact
              </a>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
              Login
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Book a Demo
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border">
              <a href="#features" className="block px-3 py-2 text-foreground hover:text-orange-500">
                Features
              </a>
              <a href="#how-it-works" className="block px-3 py-2 text-foreground hover:text-orange-500">
                How It Works
              </a>
              <a href="#pricing" className="block px-3 py-2 text-foreground hover:text-orange-500">
                Pricing
              </a>
              <a href="#students" className="block px-3 py-2 text-foreground hover:text-orange-500">
                For Students
              </a>
              <a href="#contact" className="block px-3 py-2 text-foreground hover:text-orange-500">
                Contact
              </a>
              <div className="pt-4 pb-3 border-t border-border">
                <div className="flex flex-col space-y-3 px-3">
                  <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                    Login
                  </Button>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    Book a Demo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}