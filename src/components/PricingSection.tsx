import { useState } from 'react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from './ui/button';

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for trying out the platform",
      price: { monthly: 0, yearly: 0 },
      badge: "Free Trial",
      badgeColor: "bg-green-100 text-green-700",
      icon: Star,
      features: [
        "Up to 50 students",
        "Basic resume builder",
        "Limited mock interviews",
        "Email support",
        "7-day free trial"
      ],
      limitations: [
        "Basic analytics only",
        "No WhatsApp integration"
      ],
      cta: "Start Free Trial",
      ctaVariant: "outline" as const,
      popular: false
    },
    {
      name: "Standard",
      description: "Most popular for growing colleges",
      price: { monthly: 29, yearly: 24 },
      badge: "Most Popular",
      badgeColor: "bg-orange-100 text-orange-700",
      icon: Zap,
      features: [
        "Up to 500 students",
        "Full AI resume builder",
        "Unlimited mock interviews",
        "Advanced analytics",
        "WhatsApp & email automation",
        "Instructor dashboard",
        "Priority support",
        "Custom branding"
      ],
      limitations: [],
      cta: "Get Started",
      ctaVariant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large institutions with advanced needs",
      price: { monthly: "Custom", yearly: "Custom" },
      badge: "Enterprise",
      badgeColor: "bg-purple-100 text-purple-700",
      icon: Crown,
      features: [
        "Unlimited students",
        "All Standard features",
        "Custom integrations",
        "Dedicated account manager",
        "Advanced reporting",
        "API access",
        "Custom training",
        "SLA guarantee",
        "Single sign-on (SSO)"
      ],
      limitations: [],
      cta: "Contact Sales",
      ctaVariant: "outline" as const,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full px-4 py-1 text-sm border border-purple-200 bg-purple-50 text-purple-700 mb-6">
            <span className="mr-2">💰</span>
            Simple Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Transparent pricing that scales with your institution. No hidden fees, no long-term contracts.
          </p>

          {/* Pricing Toggle */}
          <div className="inline-flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !isYearly ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isYearly ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Yearly
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`relative rounded-2xl border ${
              plan.popular ? 'border-orange-200 shadow-lg scale-105' : 'border-border'
            } bg-card overflow-hidden`}>
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${
                      plan.popular ? 'from-orange-500 to-orange-600' : 'from-gray-400 to-gray-500'
                    } rounded-lg flex items-center justify-center`}>
                      <plan.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${plan.badgeColor}`}>
                    {plan.badge}
                  </div>
                </div>

                <p className="text-muted-foreground mb-6">{plan.description}</p>

                {/* Pricing */}
                <div className="mb-8">
                  <div className="flex items-baseline space-x-2">
                    {typeof plan.price.yearly === 'string' ? (
                      <span className="text-3xl font-bold text-foreground">{plan.price.yearly}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          ₹{isYearly ? plan.price.yearly : plan.price.monthly}
                        </span>
                        <span className="text-muted-foreground">
                          /student/{isYearly ? 'year' : 'month'}
                        </span>
                      </>
                    )}
                  </div>
                  {plan.price.yearly !== 0 && typeof plan.price.yearly === 'number' && isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed annually (₹{plan.price.monthly}/student/month if paid monthly)
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, limitationIndex) => (
                    <div key={limitationIndex} className="flex items-start space-x-3 opacity-60">
                      <div className="w-5 h-5 flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                      </div>
                      <span className="text-muted-foreground text-sm">{limitation}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button 
                  variant={plan.ctaVariant}
                  className={`w-full ${
                    plan.popular ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-muted/50 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-muted-foreground mb-6">
              We offer flexible pricing for large institutions, multi-campus universities, 
              and organizations with specific requirements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline">
                Schedule Consultation
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                View Enterprise Features
              </Button>
            </div>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-green-600" />
            </div>
            <span>30-day money-back guarantee • Cancel anytime • No setup fees</span>
          </div>
        </div>
      </div>
    </section>
  );
}