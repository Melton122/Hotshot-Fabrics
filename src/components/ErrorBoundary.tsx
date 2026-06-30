// ============================================
// HOTSHOT FABRICS - ERROR BOUNDARY
// Production Ready | Enhanced
// ============================================
import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Log to error tracking service here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Something went wrong</h1>
            <p className="text-zinc-400 mb-8">
              We apologize for the inconvenience. Our team has been notified and is working on a fix.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-left overflow-auto max-h-48">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 font-mono text-sm">{this.state.error.message}</p>
                </div>
                <pre className="text-xs text-zinc-500 font-mono whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-6 py-3 border border-zinc-700 hover:border-zinc-500 rounded-xl font-bold transition-colors"
              >
                <Home className="w-4 h-4" /> Go Home
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// PAGE LOADER
// ============================================
export function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-zinc-400 text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}

// ============================================
// SKELETON COMPONENTS
// ============================================
export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-zinc-900 rounded-2xl mb-3" />
      <div className="h-4 bg-zinc-900 rounded-lg w-3/4 mb-2" />
      <div className="h-4 bg-zinc-900 rounded-lg w-1/2" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4">
      <div className="w-12 h-12 bg-zinc-900 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-900 rounded-lg w-1/3" />
        <div className="h-3 bg-zinc-900 rounded-lg w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 animate-pulse">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl mb-4" />
          <div className="h-8 bg-zinc-800 rounded-lg w-1/2 mb-2" />
          <div className="h-4 bg-zinc-800 rounded-lg w-1/3" />
        </div>
      ))}
    </div>
  );
}