import Athletes from './pages/Athletes';
import Dashboard from './pages/Dashboard';
import DataMigration from './pages/DataMigration';
import Home from './pages/Home';
import LeaderboardBuilder from './pages/LeaderboardBuilder';
import ManageUsers from './pages/ManageUsers';
import Metrics from './pages/Metrics';
import ProgressTracking from './pages/ProgressTracking';
import Reports from './pages/Reports';
import TestingCenter from './pages/TestingCenter';
import Upload from './pages/Upload';
import Workouts from './pages/Workouts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Athletes": Athletes,
    "Dashboard": Dashboard,
    "DataMigration": DataMigration,
    "Home": Home,
    "LeaderboardBuilder": LeaderboardBuilder,
    "ManageUsers": ManageUsers,
    "Metrics": Metrics,
    "ProgressTracking": ProgressTracking,
    "Reports": Reports,
    "TestingCenter": TestingCenter,
    "Upload": Upload,
    "Workouts": Workouts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};