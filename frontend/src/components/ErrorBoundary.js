import React from 'react';
import api from "../api";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Hata oluştuysa durumu güncelle
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Hata loglama (isteğe bağlı)
    console.error("ErrorBoundary yakaladı:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-600 bg-red-100 rounded shadow">
          <h2>Bir hata oluştu.</h2>
          <p>Lütfen sayfayı yenileyin ya da daha sonra tekrar deneyin.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
