import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineAlertProps {
  variant?: "error" | "success" | "warning";
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
  showIcon?: boolean;
}

const variantStyles = {
  error: {
    container: "bg-red-500/5 border-l-2 border-red-400/50",
    icon: "text-red-400",
    title: "text-red-300",
    message: "text-red-200/80",
  },
  success: {
    container: "bg-emerald-500/5 border-l-2 border-emerald-400/50",
    icon: "text-emerald-400",
    title: "text-emerald-300",
    message: "text-emerald-200/80",
  },
  warning: {
    container: "bg-amber-500/5 border-l-2 border-amber-400/50",
    icon: "text-amber-400",
    title: "text-amber-300",
    message: "text-amber-200/80",
  },
};

const icons = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
};

export function InlineAlert({
  variant = "error",
  title,
  message,
  onDismiss,
  className,
  showIcon = true,
}: InlineAlertProps) {
  const styles = variantStyles[variant];
  const Icon = icons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative rounded-xl p-4 backdrop-blur-sm",
        styles.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", styles.icon)} />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn("text-sm font-medium mb-0.5", styles.title)}>
              {title}
            </p>
          )}
          <p className={cn("text-sm", styles.message)}>{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Simple field-level error for forms
interface FieldErrorProps {
  message?: string;
  className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15 }}
          className={cn("text-xs text-red-400 mt-1.5", className)}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
