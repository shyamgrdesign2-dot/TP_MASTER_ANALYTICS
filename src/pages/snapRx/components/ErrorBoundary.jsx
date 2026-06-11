import React from "react";
import { Alert, Button } from "antd";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("SnapRx Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
            marginTop: "50px",
          }}
        >
          <Alert
            message="Something went wrong"
            description="We encountered an error while loading the upload component. Please try refreshing the page or contact support if the problem persists."
            type="error"
            showIcon
            style={{ marginBottom: "20px" }}
          />
          <Button
            type="primary"
            onClick={this.handleRetry}
            style={{ marginRight: "10px" }}
          >
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>

          {process.env.NODE_ENV === "development" && this.state.error && (
            <details
              style={{
                marginTop: "20px",
                textAlign: "left",
                background: "#f5f5f5",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              <summary>Error Details (Development Only)</summary>
              <pre style={{ fontSize: "12px", overflow: "auto" }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
