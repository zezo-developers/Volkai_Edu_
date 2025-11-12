import { useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardOverview } from './DashboardOverview';
import { StudentsModule } from './StudentsModule';
import { InstructorsModule } from './InstructorsModule';

// Placeholder components for other modules


function ReportsModule() {

}

function JobsModule() {

}

function CommunicationModule() {

}

function SettingsModule() {

}

export function MainDashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardOverview />;
      // case 'students':
      //   return <StudentsModule />;
      // case 'instructors':
      //   return <InstructorsModule />;
      // case 'interviews':
      //   return <InterviewsModule />;
      // case 'reports':
      //   return <ReportsModule />;
      // case 'jobs':
      // case 'job-postings':
      // case 'placement-insights':
      //   return <JobsModule />;
      // case 'communication':
      // case 'email-campaigns':
      // case 'whatsapp-notifications':
      //   return <CommunicationModule />;
      // case 'settings':
      //   return <SettingsModule />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <DashboardLayout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
    >
      {renderPage()}
    </DashboardLayout>
  );
}