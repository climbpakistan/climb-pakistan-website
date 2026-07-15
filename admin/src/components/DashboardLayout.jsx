import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout() {
  return (
    <div className="dashboard-shell">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
