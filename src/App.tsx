import { Component, type ErrorInfo, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/AppState';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { Search } from './pages/Search';
import { Wishlist } from './pages/Wishlist';
import { Details } from './pages/Details';
import { Player } from './pages/Player';
import { Settings } from './pages/Settings';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Cinevra crashed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-screen">
          <div className="fatal-card">
            <span className="fatal-code">Something broke</span>
            <h1>The app hit an unexpected error</h1>
            <p>{this.state.error.message}</p>
            <div className="state-actions">
              <button type="button" className="button primary" onClick={() => window.location.reload()}>
                Reload app
              </button>
              <button
                type="button"
                className="button glass"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="movies" element={<Browse type="movie" />} />
              <Route path="tv" element={<Browse type="tv" />} />
              <Route path="search" element={<Search />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="title/:mediaType/:id" element={<Details />} />
              <Route path="settings" element={<Settings />} />
              <Route path="about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="watch/:mediaType/:id" element={<Player />} />
          </Routes>
        </HashRouter>
      </AppProvider>
    </AppErrorBoundary>
  );
}
