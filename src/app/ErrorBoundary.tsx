import { Component, ErrorInfo, ReactNode } from 'react';
import './error-boundary.scss';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary] Unhandled error caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.hash = '';
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className='error-boundary'>
                    <div className='error-boundary__panel'>
                        <div className='error-boundary__icon'>Warning</div>
                        <h1 className='error-boundary__title'>Something went wrong</h1>
                        <p className='error-boundary__message'>
                            An unexpected error occurred. Your account and settings are safe - reload to recover.
                        </p>
                        {this.state.error && (
                            <details className='error-boundary__details'>
                                <summary>Technical details</summary>
                                <pre className='error-boundary__trace'>{this.state.error.message}</pre>
                            </details>
                        )}
                        <button className='error-boundary__btn' onClick={this.handleReset}>
                            Reload &amp; Recover
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
