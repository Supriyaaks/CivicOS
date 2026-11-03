import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PortalLayout from '../layouts/PortalLayout';
import UserSelectionPage from '../pages/UserSelectionPage';
import CitizenDashboard from '../pages/citizen/CitizenDashboard';
import ReportProblem from '../pages/citizen/ReportProblem';
import MyComplaints from '../pages/citizen/MyComplaints';
import ComplaintDetails from '../pages/citizen/ComplaintDetails';
import NearbyProblems from '../pages/citizen/NearbyProblems';
import Notifications from '../pages/citizen/Notifications';
import ResolutionConfirmation from '../pages/citizen/ResolutionConfirmation';
import PersonalProfile from '../pages/citizen/PersonalProfile';
import OfficerDashboard from '../pages/officer/OfficerDashboard';
import IncidentManagement from '../pages/officer/operations/IncidentManagement';
import ResourceAllocation from '../pages/officer/ResourceAllocation';
import DeptCoordination from '../pages/officer/operations/CrossDeptCoordination';
import PerformanceAnalytics from '../pages/officer/learning/CivicAnalytics';
import DigitalTwin from '../pages/officer/DigitalTwin';
import EmergencyCenter from '../pages/officer/EmergencyCenter';
import IncidentClustering from '../pages/officer/intelligence/IncidentClustering';
import PredictiveIntelligence from '../pages/officer/intelligence/PredictiveIntelligence';
import RootCauseAnalysis from '../pages/officer/intelligence/RootCauseAnalysis';
import ImpactSeverity from '../pages/officer/intelligence/ImpactSeverity';
import CascadingRisk from '../pages/officer/intelligence/CascadingRisk';
import WeatherIntelligence from '../pages/officer/intelligence/WeatherIntelligence';
import IncidentDetails from '../pages/officer/operations/IncidentDetails';
import DeptAssignment from '../pages/officer/operations/DeptAssignment';
import WhatIfSimulation from '../pages/officer/operations/WhatIfSimulation';
import RoadRepairVerification from '../pages/officer/operations/RoadRepairVerification';
import ResolutionVerification from '../pages/officer/operations/ResolutionVerification';
import AIValidation from '../pages/officer/AIValidation';
import ResourceOptimization from '../pages/officer/operations/ResourceOptimization';
import DeptMgmt from '../pages/officer/management/DeptMgmt';
import UserMgmt from '../pages/officer/management/UserMgmt';
import OfficerSettings from '../pages/officer/management/OfficerSettings';
import AICivicAssistant from '../pages/officer/learning/AICivicAssistant';
import IncidentHistory from '../pages/officer/learning/IncidentHistory';
import GeospatialIntelligence from '../pages/officer/learning/GeospatialIntelligence';
import StaffDashboard from '../pages/staff/dashboard';
import AssignedTasks from '../pages/staff/assigned-tasks';
import TaskDetails from '../pages/staff/task-details';
import AcceptAssignment from '../pages/staff/accept-assignment';
import RejectAssignment from '../pages/staff/reject-assignment';
import UpdateProgress from '../pages/staff/update-progress';
import UploadEvidence from '../pages/staff/upload-evidence';
import RepairVerification from '../pages/staff/verification-status';
import TaskHistoryStaff from '../pages/staff/history';
import StaffProfile from '../pages/staff/profile';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<UserSelectionPage />} />

      <Route element={<PortalLayout />}>
        {/* Citizen Portal */}
        <Route path="/citizen">
          <Route index element={<CitizenDashboard />} />
          <Route path="report" element={<ReportProblem />} />
          <Route path="my-complaints" element={<MyComplaints />} />
          <Route path="complaint/:id" element={<ComplaintDetails />} />
          <Route path="nearby" element={<NearbyProblems />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="resolution/:id" element={<ResolutionConfirmation />} />
          <Route path="profile" element={<PersonalProfile />} />
        </Route>

        {/* Officer Portal */}
        <Route path="/officer">
          <Route index element={<OfficerDashboard />} />
          <Route path="digital-twin" element={<DigitalTwin />} />
          <Route path="emergency" element={<EmergencyCenter />} />
          <Route path="clustering" element={<IncidentClustering />} />
          <Route path="predictive" element={<PredictiveIntelligence />} />
          <Route path="root-cause" element={<RootCauseAnalysis />} />
          <Route path="impact" element={<ImpactSeverity />} />
          <Route path="risk" element={<CascadingRisk />} />
          <Route path="weather" element={<WeatherIntelligence />} />
          <Route path="incidents" element={<IncidentManagement />} />
          <Route path="details">
            <Route index element={<IncidentDetails />} />
            <Route path=":id" element={<IncidentDetails />} />
          </Route>
          <Route path="assignment">
            <Route index element={<DeptAssignment />} />
            <Route path=":id" element={<DeptAssignment />} />
          </Route>
          <Route path="coordination" element={<DeptCoordination />} />
          <Route path="resources" element={<ResourceAllocation />} />
          <Route path="optimization" element={<ResourceOptimization />} />
          <Route path="simulation" element={<WhatIfSimulation />} />
          <Route path="verification">
            <Route index element={<ResolutionVerification />} />
            <Route path=":id" element={<ResolutionVerification />} />
          </Route>
          <Route path="road-repair">
            <Route index element={<RoadRepairVerification />} />
            <Route path=":id" element={<RoadRepairVerification />} />
          </Route>
          <Route path="validation" element={<AIValidation />} />
          <Route path="dept-mgmt" element={<DeptMgmt />} />
          <Route path="user-mgmt" element={<UserMgmt />} />
          <Route path="settings" element={<OfficerSettings />} />
          <Route path="analytics" element={<PerformanceAnalytics />} />
          <Route path="assistant" element={<AICivicAssistant />} />
          <Route path="history" element={<IncidentHistory />} />
          <Route path="geospatial" element={<GeospatialIntelligence />} />
        </Route>

        {/* Staff Portal */}
        <Route path="/staff">
          <Route index element={<StaffDashboard />} />
          <Route path="tasks" element={<AssignedTasks />} />
          <Route path="task">
            <Route path=":id" element={<TaskDetails />} />
            <Route path=":id/task-details" element={<TaskDetails />} />
            <Route path=":id/accept" element={<AcceptAssignment />} />
            <Route path=":id/reject" element={<RejectAssignment />} />
            <Route path=":id/progress" element={<UpdateProgress />} />
            <Route path=":id/upload" element={<UploadEvidence />} />
            <Route path=":id/verification" element={<RepairVerification />} />
          </Route>
          <Route path="history" element={<TaskHistoryStaff />} />
          <Route path="profile" element={<StaffProfile />} />
        </Route>
      </Route>

      <Route path="*" element={
        <div className="flex items-center justify-center h-screen">
          <h1 className="text-2xl font-semibold">404 - Page Not Found</h1>
        </div>
      } />
    </Routes>
  );
};

export default AppRoutes;
