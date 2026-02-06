import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { ChatBubbles } from '@/components/ui/visual-elements';

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactDialog({ isOpen, onClose }: ContactDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg apple-dialog p-8 overflow-hidden">
              {/* Glow effect */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Header */}
              <div className="relative z-10 flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ChatBubbles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Get in Touch</h2>
                  <p className="text-sm text-muted-foreground">We'd love to hear from you</p>
                </div>
              </div>
              
              {/* Form */}
              <div className="relative z-10">
                <ContactForm onClose={onClose} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
