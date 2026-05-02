'use client';
import React, { Component, ReactNode } from 'react';
import { Camera, Mic, AlertTriangle, RefreshCw } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Props {
  children: ReactNode;
  type?: 'camera' | 'voice' | 'media';
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class MediaErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Une erreur inattendue est survenue',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MediaErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      const { type = 'media', fallbackMessage } = this.props;
      const Icon = type === 'camera' ? Camera : type === 'voice' ? Mic : AlertTriangle;
      const label =
        type === 'camera' ?'Capture photo indisponible'
          : type === 'voice' ?'Reconnaissance vocale indisponible' :'Fonctionnalité média indisponible';

      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <Icon size={13} className="shrink-0 text-amber-500" />
          <span className="flex-1">
            {fallbackMessage || label}
            {this.state.errorMessage && (
              <span className="block text-amber-500 mt-0.5 font-mono text-[10px]">
                {this.state.errorMessage}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1 text-amber-600 hover:text-amber-800 font-medium shrink-0"
            title="Réessayer"
          >
            <RefreshCw size={11} />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MediaErrorBoundary;
