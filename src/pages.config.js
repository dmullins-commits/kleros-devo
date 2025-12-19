import Athletes from './pages/Athletes';
import CleanupClinton from './pages/CleanupClinton';
import CleanupUnknownTeams from './pages/CleanupUnknownTeams';
import Dashboard from './pages/Dashboard';
import DataMigration from './pages/DataMigration';
import DataMigrationOrg from './pages/DataMigrationOrg';
import FixUnknownAthletes from './pages/FixUnknownAthletes';
import Home from './pages/Home';
import LeaderboardBuilder from './pages/LeaderboardBuilder';
import ManageUsers from './pages/ManageUsers';
import Metrics from './pages/Metrics';
import MigrateTeamsClassPeriods from './pages/MigrateTeamsClassPeriods';
import ProgressTracking from './pages/ProgressTracking';
import Reports from './pages/Reports';
import TestingCenter from './pages/TestingCenter';
import Upload from './pages/Upload';
import Workouts from './pages/Workouts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Athletes": Athletes,
    "CleanupClinton": CleanupClinton,
    "CleanupUnknownTeams": CleanupUnknownTeams,
    "Dashboard": Dashboard,
    "DataMigration": DataMigration,
    "DataMigrationOrg": DataMigrationOrg,
    "FixUnknownAthletes": FixUnknownAthletes,
    "Home": Home,
    "LeaderboardBuilder": LeaderboardBuilder,
    "ManageUsers": ManageUsers,
    "Metrics": Metrics,
    "MigrateTeamsClassPeriods": MigrateTeamsClassPeriods,
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