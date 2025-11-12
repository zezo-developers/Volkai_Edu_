import CommunicationModule from "../components/dashboard/CommunicationModule";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { InstructorsModule } from "../components/dashboard/InstructorsModule";
import InterviewsModule from "../components/dashboard/InterviewsModule";
import JobsModule from "../components/dashboard/JobsModule";
import { MainDashboard } from "../components/dashboard/MainDashboard";
import ReportsModule from "../components/dashboard/ReportsModule";
import SettingsModule from "../components/dashboard/SettingsModule";
import { StudentsModule } from "../components/dashboard/StudentsModule";

const dashboardRoutes = [
    {  
        path:'/dashboard', 
        element: <MainDashboard/>,
        children:[
            { index: true, element: <DashboardOverview /> },  // /dashboard
            { path: "students", element: <StudentsModule /> }, // /dashboard/students
            { path: "instructors", element: <InstructorsModule /> },
            { path: "interviews", element: <InterviewsModule /> },
            { path: "reports", element: <ReportsModule /> },
            { path: "jobs", element: <JobsModule /> },
            { path: "communication", element: <CommunicationModule /> },
            { path: "settings", element: <SettingsModule /> },
        ]
    }
]

export default dashboardRoutes;