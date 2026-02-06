import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useBrandConfig } from '@/hooks/useBrandConfig';

export default function Terms() {
  const navigate = useNavigate();
  const { appName, supportEmail } = useBrandConfig();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary-foreground/90" />
            </div>
            <span className="font-semibold text-foreground">{appName}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 22, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using {appName} ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service. We reserve the right to update 
              these terms at any time, and your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              {appName} is an AI-powered lead generation and outreach platform that helps businesses discover, 
              enrich, and engage with potential customers. The Service includes lead finding, data enrichment, 
              campaign management, and outreach automation features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use certain features of the Service, you must register for an account. You agree to provide 
              accurate, current, and complete information during registration and to update such information 
              to keep it accurate, current, and complete. You are responsible for maintaining the confidentiality 
              of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any applicable laws or regulations, including anti-spam laws (CAN-SPAM, GDPR, etc.)</li>
              <li>Send unsolicited bulk emails or engage in spam activities</li>
              <li>Harvest or collect email addresses without consent</li>
              <li>Attempt to circumvent any security measures of the Service</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Subscription and Billing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid features of the Service are billed on a subscription basis. You will be billed in advance 
              on a recurring basis ("Billing Cycle"). At the end of each Billing Cycle, your subscription will 
              automatically renew unless you cancel it or we cancel it. Credits do not roll over between billing periods.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Subscription fees are non-refundable except where required by law. If you cancel your subscription, 
              you will continue to have access to paid features until the end of your current billing period. 
              Unused credits are not refundable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are and will remain the exclusive 
              property of {appName} and its licensors. Our trademarks may not be used in connection with any 
              product or service without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent 
              to the collection and use of information as described in our Privacy Policy. You are responsible 
              for ensuring your use of lead data complies with applicable privacy laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, {appName} shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including loss of profits, data, or business opportunities, 
              arising out of or in connection with your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or 
              implied. We do not guarantee that lead data will be accurate, complete, or up-to-date at all times.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice 
              or liability, for any reason, including breach of these Terms. Upon termination, your right to use 
              the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in 
              which {appName} operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through the contact form on our website 
              or at {supportEmail}.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2025 {appName}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <button 
              onClick={() => navigate('/')}
              className="hover:text-foreground transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
