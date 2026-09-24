import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ConferencesProvider } from './store/conferences';
import { LeadsProvider } from './store/leads';
import { EntryScreen } from './pages/EntryScreen';
import { ExplorerPage } from './pages/ExplorerPage';
import { ConferenceDetailPage } from './pages/ConferenceDetailPage';
import { PlanningPage } from './pages/PlanningPage';
import { LeadsPage } from './pages/LeadsPage';
import { LeadProfilePage } from './pages/LeadProfilePage';

/** Reset scroll position on navigation so detail pages open at the top. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ConferencesProvider>
      <LeadsProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Branded entry screen → one click into the workspace at /conferences. */}
            <Route path="/" element={<EntryScreen />} />
            <Route path="/conferences" element={<ExplorerPage />} />
            {/* Explore merged into Conferences; keep old links working. */}
            <Route path="/explore" element={<Navigate to="/conferences" replace />} />
            <Route path="/planning" element={<PlanningPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:contactId" element={<LeadProfilePage />} />
            <Route path="/conference/:id" element={<ConferenceDetailPage />} />
            <Route path="*" element={<Navigate to="/conferences" replace />} />
          </Routes>
        </BrowserRouter>
      </LeadsProvider>
    </ConferencesProvider>
  );
}
