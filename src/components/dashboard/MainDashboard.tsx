import { useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardOverview } from './DashboardOverview';
import { StudentsModule } from './StudentsModule';
import { InstructorsModule } from './InstructorsModule';

// Placeholder components for other modules
function InterviewsModule() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Interviews</h1>
      <p className="text-muted-foreground">Manage mock interviews and track student performance</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Total Interviews</h3>
          <p className="text-2xl font-bold text-orange-500">624</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Scheduled Today</h3>
          <p className="text-2xl font-bold text-blue-500">12</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Average Score</h3>
          <p className="text-2xl font-bold text-green-500">78%</p>
        </div>
      </div>
    </div>
  );
}

function ReportsModule() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Reports</h1>
      <p className="text-muted-foreground">Generate and export detailed placement reports</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Placement Readiness Report</h3>
          <p className="text-muted-foreground mb-4">Comprehensive analysis of student preparation</p>
          <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
            Generate Report
          </button>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Department Performance</h3>
          <p className="text-muted-foreground mb-4">Compare performance across departments</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}

function JobsModule() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Jobs & Placement</h1>
      <p className="text-muted-foreground">Manage job postings and track placement activities</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Active Job Postings</h3>
          <p className="text-2xl font-bold text-orange-500">15</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Students Placed</h3>
          <p className="text-2xl font-bold text-green-500">312</p>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-2">Placement Rate</h3>
          <p className="text-2xl font-bold text-blue-500">85%</p>
        </div>
      </div>
    </div>
  );
}

function CommunicationModule() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Communication</h1>
      <p className="text-muted-foreground">Manage email campaigns and WhatsApp notifications</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Email Campaigns</h3>
          <p className="text-muted-foreground mb-4">Send bulk emails to students and instructors</p>
          <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
            Create Campaign
          </button>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">WhatsApp Notifications</h3>
          <p className="text-muted-foreground mb-4">Automated reminders and updates</p>
          <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
            Send Notification
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModule() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Settings & Billing</h1>
      <p className="text-muted-foreground">Manage account settings and subscription</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Institution Settings</h3>
          <p className="text-muted-foreground mb-4">Update college information and preferences</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
            Edit Settings
          </button>
        </div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Billing & Plans</h3>
          <p className="text-muted-foreground mb-4">Manage subscription and view invoices</p>
          <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
            View Billing
          </button>
        </div>
      </div>
    </div>
  );
}

export function MainDashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'students':
        return <StudentsModule />;
      case 'instructors':
        return <InstructorsModule />;
      case 'interviews':
        return <InterviewsModule />;
      case 'reports':
        return <ReportsModule />;
      case 'jobs':
      case 'job-postings':
      case 'placement-insights':
        return <JobsModule />;
      case 'communication':
      case 'email-campaigns':
      case 'whatsapp-notifications':
        return <CommunicationModule />;
      case 'settings':
        return <SettingsModule />;
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