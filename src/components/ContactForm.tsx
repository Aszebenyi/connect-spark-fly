import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { SparkBurst } from '@/components/ui/visual-elements';

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  company: z.string().trim().max(100, "Company must be less than 100 characters").optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be less than 1000 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  onClose?: () => void;
}

export function ContactForm({ onClose }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof ContactFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: result.data.name,
          email: result.data.email,
          company: result.data.company || null,
          message: result.data.message,
        });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      });

      // Close after animation
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
          >
            <SparkBurst className="w-10 h-10" />
          </motion.div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Thank You!</h3>
          <p className="text-muted-foreground">We'll be in touch soon.</p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={`w-full h-12 px-4 apple-input ${errors.name ? 'border-destructive' : ''}`}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@company.com"
                className={`w-full h-12 px-4 apple-input ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Acme Inc."
              className={`w-full h-12 px-4 apple-input ${errors.company ? 'border-destructive' : ''}`}
            />
            {errors.company && (
              <p className="text-xs text-destructive">{errors.company}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about your needs..."
              rows={4}
              className={`w-full px-4 py-3 apple-input resize-none ${errors.message ? 'border-destructive' : ''}`}
            />
            {errors.message && (
              <p className="text-xs text-destructive">{errors.message}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full apple-button h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              'Send Message'
            )}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
