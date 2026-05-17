import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, Switch } from 'wouter'
import Layout from './components/layout/Layout'
import DocsPage from './pages/Docs'
import HomePage from './pages/Home'
import MarketplacePage from './pages/Marketplace'
import TaskDetailPage from './pages/TaskDetail'
import TasksPage from './pages/Tasks'
import TechPage from './pages/Tech'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Switch>
          <Route component={HomePage} path="/" />
          <Route component={MarketplacePage} path="/marketplace" />
          <Route component={TasksPage} path="/tasks" />
          <Route component={TaskDetailPage} path="/tasks/:id" />
          <Route component={TechPage} path="/tech" />
          <Route component={DocsPage} path="/docs" />
        </Switch>
      </Layout>
    </QueryClientProvider>
  )
}
