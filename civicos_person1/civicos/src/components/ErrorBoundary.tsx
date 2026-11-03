import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CivicOS Portal Caught Error in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm">
              🛡️
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
                CivicOS Portal Safeguard
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                {this.props.fallbackTitle || 'Component Rendering Safeguard'}
              </h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                A minor interface error occurred while rendering this civic module. The core CivicOS backend and intelligence engines remain active and operational.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-left font-mono text-xs overflow-x-auto max-h-40 border border-slate-800">
                <p className="text-red-400 font-bold mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-500 text-[10px] whitespace-pre-wrap leading-tight mt-2">
                    {this.state.errorInfo.componentStack.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>🔄</span> Reload View
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
