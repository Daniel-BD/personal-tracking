import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

interface Props {
	children: ReactNode;
	/** Optional label shown in the fallback to identify which section failed */
	label?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[ErrorBoundary]', error, info.componentStack);
	}

	handleReload = () => {
		window.location.reload();
	};

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (!this.state.hasError) {
			return this.props.children;
		}

		const { label } = this.props;

		return (
			<div
				className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
				role="alert"
				aria-live="assertive"
			>
				<div className="card p-8 max-w-sm w-full space-y-4">
					<div
						className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
						style={{ background: 'var(--color-danger-bg)' }}
					>
						<CircleAlert size={24} style={{ color: 'var(--color-danger)' }} />
					</div>

					<div className="space-y-1">
						<h2 className="text-heading font-semibold text-lg">Something went wrong</h2>
						{label && <p className="text-subtle text-sm">{label} failed to load.</p>}
					</div>

					<div className="flex flex-col gap-2">
						<button type="button" onClick={this.handleReload} className="btn btn-primary w-full">
							Reload page
						</button>
						<button type="button" onClick={this.handleReset} className="btn btn-secondary w-full">
							Try again
						</button>
					</div>
				</div>
			</div>
		);
	}
}
