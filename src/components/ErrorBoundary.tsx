import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends (React.Component as any) {
  public state: State;
  public props: Props;
  public setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Ejaz ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReset = async () => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch (e) {
      console.warn('Clear error:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="ejaz-error-boundary-screen"
          className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                تنبيه: حدث خطأ غير متوقع
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                تم رصد تعارض مؤقت في ذاكرة المتصفح أو أثناء تحميل أحد المكونات. يمكنك استعادة النظام فوراً من خلال الأزرار أدناه:
              </p>
            </div>

            {this.state.error && (
              <div className="text-right bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-rose-300 max-h-28 overflow-y-auto ltr dir-ltr select-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                id="btn-error-reload"
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition shadow-lg cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل الصفحة الآن</span>
              </button>

              <button
                id="btn-error-clear-cache"
                type="button"
                onClick={this.handleClearAndReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>تفريغ الذاكرة المؤقتة وإعادة التشغيل النظيف</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
