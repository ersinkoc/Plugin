import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { Layout } from '@/components/layout/Layout';
import { Home } from '@/pages/Home';
import { Docs } from '@/pages/docs/Docs';
import { GettingStarted } from '@/pages/docs/GettingStarted';
import { Kernel } from '@/pages/docs/Kernel';
import { Plugins } from '@/pages/docs/Plugins';
import { Events } from '@/pages/docs/Events';
import { Dependencies } from '@/pages/docs/Dependencies';
import { ErrorHandling } from '@/pages/docs/ErrorHandling';
import { Context } from '@/pages/docs/Context';
import { Advanced } from '@/pages/docs/Advanced';
import { API } from '@/pages/API';
import { Examples } from '@/pages/Examples';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="docs" element={<Docs />}>
              <Route index element={<GettingStarted />} />
              <Route path="getting-started" element={<GettingStarted />} />
              <Route path="kernel" element={<Kernel />} />
              <Route path="plugins" element={<Plugins />} />
              <Route path="events" element={<Events />} />
              <Route path="dependencies" element={<Dependencies />} />
              <Route path="error-handling" element={<ErrorHandling />} />
              <Route path="context" element={<Context />} />
              <Route path="advanced" element={<Advanced />} />
            </Route>
            <Route path="api" element={<API />} />
            <Route path="examples" element={<Examples />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
