import Dashboard from './pages/Dashboard';
import Athletes from './pages/Athletes';
import Upload from './pages/Upload';
import Metrics from './pages/Metrics';
import Workouts from './pages/Workouts';
import ProgressTracking from './pages/ProgressTracking';
import DataMigration from './pages/DataMigration';
import TestingCenter from './pages/TestingCenter';
import Reports from './pages/Reports';
import ManageUsers from './pages/ManageUsers';
import DataMigrationOrg from './pages/DataMigrationOrg';
import CleanupClinton from './pages/CleanupClinton';
import CleanupUnknownTeams from './pages/CleanupUnknownTeams';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Athletes": Athletes,
    "Upload": Upload,
    "Metrics": Metrics,
    "Workouts": Workouts,
    "ProgressTracking": ProgressTracking,
    "DataMigration": DataMigration,
    "TestingCenter": TestingCenter,
    "Reports": Reports,
    "ManageUsers": ManageUsers,
    "DataMigrationOrg": DataMigrationOrg,
    "CleanupClinton": CleanupClinton,
    "CleanupUnknownTeams": CleanupUnknownTeams,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};