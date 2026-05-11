import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    })
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border-2 border-red-500">
            <h1 className="text-red-500 text-3xl font-bold mb-4">⚠️ Oops! Something went wrong</h1>
            <p className="text-gray-300 mb-4">
              We encountered an unexpected error. Please try again.
            </p>
            {import.meta.env.DEV && (
              <details className="text-left mb-4 bg-slate-700 p-3 rounded text-sm text-gray-300">
                <summary className="cursor-pointer font-bold mb-2">Error Details (Dev)</summary>
                <pre className="overflow-auto max-h-48">{this.state.error?.toString()}</pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 rounded-lg"
              >
                🏠 Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg"
              >
                🔄 Reload
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
