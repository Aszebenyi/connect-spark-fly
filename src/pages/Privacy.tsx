import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useBrandConfig } from '@/hooks/useBrandConfig';

export default function Privacy() {
  const navigate = useNavigate();
  const { appName, privacyEmail } = useBrandConfig();

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
        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 22, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              {appName} ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our lead generation and 
              outreach platform (the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Information:</strong> Name, email address, company name, and password when you register</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through our payment provider (Stripe)</li>
              <li><strong>Profile Information:</strong> Any additional information you choose to add to your profile</li>
              <li><strong>Communications:</strong> Messages you send us through support channels</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Usage Data:</strong> How you interact with the Service, features used, and actions taken</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers</li>
              <li><strong>Cookies:</strong> We use cookies and similar technologies to enhance your experience</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.3 Lead Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you use our lead finding features, we process publicly available business information to help 
              you identify potential customers. This data is sourced from public directories, company websites, 
              and professional networks.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
              <li>Personalize and improve your experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Providers:</strong> With third parties who perform services on our behalf (hosting, payment processing, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly agree to the sharing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. This includes encryption, 
              secure servers, and regular security audits. However, no method of transmission over the Internet 
              is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide 
              you services. We may retain certain information for longer periods as required by law or for 
              legitimate business purposes. Lead data you generate is retained in your account until you delete 
              it or close your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your information</li>
              <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. GDPR Compliance (EEA Users)</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are in the European Economic Area (EEA), you have additional rights under the General Data 
              Protection Regulation (GDPR). We process your data based on: contract performance, legitimate 
              interests, legal obligations, or your consent. You have the right to lodge a complaint with your 
              local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. CCPA Compliance (California Users)</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are a California resident, you have specific rights under the California Consumer Privacy 
              Act (CCPA), including the right to know what personal information we collect, delete your information, 
              and opt-out of the sale of your information. We do not sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain 
              information. You can instruct your browser to refuse all cookies or to indicate when a cookie is 
              being sent. However, some parts of our Service may not function properly without cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites or integrate with third-party services. 
              We are not responsible for the privacy practices of these third parties. We encourage you to 
              read their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for use by children under the age of 16. We do not knowingly collect 
              personal information from children under 16. If you become aware that a child has provided us with 
              personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review 
              this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or wish to exercise your rights, please contact 
              us through the contact form on our website or at {privacyEmail}.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2025 {appName}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
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
