import { useState } from 'react';
import { StudentDashboardLayout } from './StudentDashboardLayout';
import { StudentDashboardOverview } from './StudentDashboardOverview';

// Placeholder components for student modules
function ResumeBuilderModule() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">AI Resume Builder</h1>
        <p className="text-blue-100">Create an ATS-optimized resume that gets you noticed</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-all">
          <h3 className="font-semibold mb-2 text-green-600">Current Resume Score</h3>
          <p className="text-3xl font-bold text-slate-900 mb-2">85/100</p>
          <p className="text-sm text-green-600">Excellent! ATS-Ready</p>
        </div>
        <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-all">
          <h3 className="font-semibold mb-2 text-blue-600">Templates Used</h3>
          <p className="text-3xl font-bold text-slate-900 mb-2">3</p>
          <p className="text-sm text-blue-600">Modern, Classic, Creative</p>
        </div>
        <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-all">
          <h3 className="font-semibold mb-2 text-orange-600">Last Updated</h3>
          <p className="text-3xl font-bold text-slate-900 mb-2">2</p>
          <p className="text-sm text-orange-600">Days ago</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              📝 Create New Resume
            </button>
            <button className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              📄 Upload Existing Resume
            </button>
            <button className="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              🔗 Import from LinkedIn
            </button>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">AI Feedback</h3>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-sm">Add more action verbs to your experience section</p>
            </div>
            <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
              <p className="text-sm">Great job! Your skills section is well-optimized</p>
            </div>
            <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <p className="text-sm">Consider adding measurable achievements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockInterviewsModule() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Mock Interviews</h1>
        <p className="text-green-100">Practice with AI interviewers and get instant feedback</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-all">
          <h3 className="font-semibold mb-2 text-green-600">Interviews Completed</h3>
          <p className="text-3xl font-bold text-slate-900 mb-2">3</p>
          <p className="text-sm text-green-600">Average Score: 78%</p>
        </div>
        <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-all">
          <h3 className="font-semibold mb-2 text-blue-600">Next Interview</h3>
          <p className="text-lg font-bold text-slate-900 mb-2">Tomorrow</p>
          <p className="text-sm text-blue-600">Technical Round - 10:00 AM</p>
        </div>
        <div className="bg-white p-6 rounded-lg border hover:shadow-lg transition-all">
          <h3 className="font-semibold mb-2 text-purple-600">Best Score</h3>
          <p className="text-3xl font-bold text-slate-900 mb-2">85%</p>
          <p className="text-sm text-purple-600">HR Round</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-semibold mb-4">Start New Interview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-green-200 hover:border-green-400 rounded-lg transition-all text-center">
            <div className="text-2xl mb-2">👔</div>
            <h4 className="font-medium">HR Round</h4>
            <p className="text-sm text-slate-600">Behavioral questions</p>
          </button>
          <button className="p-4 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all text-center">
            <div className="text-2xl mb-2">💻</div>
            <h4 className="font-medium">Technical</h4>
            <p className="text-sm text-slate-600">Coding & concepts</p>
          </button>
          <button className="p-4 border-2 border-purple-200 hover:border-purple-400 rounded-lg transition-all text-center">
            <div className="text-2xl mb-2">👥</div>
            <h4 className="font-medium">Group Discussion</h4>
            <p className="text-sm text-slate-600">Communication skills</p>
          </button>
          <button className="p-4 border-2 border-orange-200 hover:border-orange-400 rounded-lg transition-all text-center">
            <div className="text-2xl mb-2">🎯</div>
            <h4 className="font-medium">Case Study</h4>
            <p className="text-sm text-slate-600">Problem solving</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function CareerAdvisorModule() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">AI Career Advisor</h1>
        <p className="text-purple-100">Get personalized career guidance and recommendations</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Recommended Career Paths</h3>
          <div className="space-y-4">
            {[
              { title: 'Software Engineer', match: '92%', description: 'Perfect match based on your CS background and coding skills' },
              { title: 'Data Scientist', match: '85%', description: 'Great fit with your analytical and programming abilities' },
              { title: 'Product Manager', match: '78%', description: 'Good match considering your leadership potential' }
            ].map((career, index) => (
              <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900">{career.title}</h4>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">{career.match} Match</span>
                </div>
                <p className="text-sm text-slate-600">{career.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold mb-4">Skill Gap Analysis</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">React.js</span>
                  <span className="text-sm text-green-600">Strong</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">System Design</span>
                  <span className="text-sm text-yellow-600">Needs Work</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Communication</span>
                  <span className="text-sm text-blue-600">Good</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold mb-4">Action Plan</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Complete System Design course</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked className="rounded" />
                <span className="text-sm line-through text-slate-500">Update LinkedIn profile</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Practice 5 more mock interviews</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsModule() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Progress Reports</h1>
        <p className="text-orange-100">Track your career preparation journey</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="font-semibold mb-2 text-blue-600">Overall Progress</h3>
          <p className="text-4xl font-bold text-slate-900 mb-2">78%</p>
          <p className="text-sm text-green-600">+5% from last week</p>
        </div>
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="font-semibold mb-2 text-green-600">Resume Score</h3>
          <p className="text-4xl font-bold text-slate-900 mb-2">85</p>
          <p className="text-sm text-green-600">ATS Optimized</p>
        </div>
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="font-semibold mb-2 text-purple-600">Interview Avg</h3>
          <p className="text-4xl font-bold text-slate-900 mb-2">72%</p>
          <p className="text-sm text-blue-600">3 interviews taken</p>
        </div>
        <div className="bg-white p-6 rounded-lg border text-center">
          <h3 className="font-semibold mb-2 text-orange-600">Skills Tested</h3>
          <p className="text-4xl font-bold text-slate-900 mb-2">8</p>
          <p className="text-sm text-purple-600">Out of 12 planned</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-semibold mb-4">Download Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all text-left">
            <h4 className="font-medium text-blue-600">Resume Analysis Report</h4>
            <p className="text-sm text-slate-600 mt-1">Detailed breakdown of your resume score and improvements</p>
          </button>
          <button className="p-4 border-2 border-green-200 hover:border-green-400 rounded-lg transition-all text-left">
            <h4 className="font-medium text-green-600">Interview Performance Report</h4>
            <p className="text-sm text-slate-600 mt-1">Comprehensive analysis of your mock interviews</p>
          </button>
          <button className="p-4 border-2 border-purple-200 hover:border-purple-400 rounded-lg transition-all text-left">
            <h4 className="font-medium text-purple-600">Career Readiness Report</h4>
            <p className="text-sm text-slate-600 mt-1">Overall assessment and growth tracking</p>
          </button>
          <button className="p-4 border-2 border-orange-200 hover:border-orange-400 rounded-lg transition-all text-left">
            <h4 className="font-medium text-orange-600">Skills Assessment Report</h4>
            <p className="text-sm text-slate-600 mt-1">Detailed results from all skill tests taken</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function SkillTestsModule() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Skill Tests</h1>
        <p className="text-indigo-100">Assess and improve your technical and soft skills</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4 text-blue-600">Technical Skills</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">JavaScript Fundamentals</h4>
              <p className="text-sm text-slate-600">45 questions • 60 minutes</p>
            </button>
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">React.js Advanced</h4>
              <p className="text-sm text-slate-600">30 questions • 45 minutes</p>
            </button>
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">System Design Basics</h4>
              <p className="text-sm text-slate-600">20 questions • 90 minutes</p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4 text-green-600">Aptitude Tests</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">Quantitative Aptitude</h4>
              <p className="text-sm text-slate-600">40 questions • 50 minutes</p>
            </button>
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">Logical Reasoning</h4>
              <p className="text-sm text-slate-600">35 questions • 45 minutes</p>
            </button>
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">Verbal Ability</h4>
              <p className="text-sm text-slate-600">30 questions • 40 minutes</p>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4 text-purple-600">Soft Skills</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">Communication Skills</h4>
              <p className="text-sm text-slate-600">25 questions • 30 minutes</p>
            </button>
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">Leadership Assessment</h4>
              <p className="text-sm text-slate-600">20 questions • 25 minutes</p>
            </button>
            <button className="w-full p-3 text-left border hover:shadow-md rounded-lg transition-all">
              <h4 className="font-medium">Problem Solving</h4>
              <p className="text-sm text-slate-600">30 questions • 40 minutes</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportModule() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-teal-100">Get help when you need it most</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            <details className="border rounded-lg">
              <summary className="p-3 font-medium cursor-pointer">How do I improve my resume score?</summary>
              <div className="p-3 border-t bg-slate-50">
                <p className="text-sm text-slate-600">Focus on using action verbs, quantifying achievements, and ensuring ATS compatibility.</p>
              </div>
            </details>
            <details className="border rounded-lg">
              <summary className="p-3 font-medium cursor-pointer">How are mock interviews scored?</summary>
              <div className="p-3 border-t bg-slate-50">
                <p className="text-sm text-slate-600">Our AI analyzes your responses based on content quality, communication skills, and relevance.</p>
              </div>
            </details>
            <details className="border rounded-lg">
              <summary className="p-3 font-medium cursor-pointer">Can I retake skill tests?</summary>
              <div className="p-3 border-t bg-slate-50">
                <p className="text-sm text-slate-600">Yes, you can retake tests after 24 hours to track your improvement.</p>
              </div>
            </details>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Contact Your Mentor</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Dr. Rajesh Kumar</h4>
              <p className="text-sm text-blue-700">Computer Science Department</p>
              <p className="text-sm text-blue-600 mt-1">Available Mon-Fri, 9 AM - 5 PM</p>
            </div>
            <button className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
              Schedule 1-on-1 Session
            </button>
            <button className="w-full p-3 border border-blue-500 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MainStudentDashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <StudentDashboardOverview />;
      case 'resume-builder':
        return <ResumeBuilderModule />;
      case 'mock-interviews':
        return <MockInterviewsModule />;
      case 'career-advisor':
        return <CareerAdvisorModule />;
      case 'skill-tests':
        return <SkillTestsModule />;
      case 'reports':
        return <ReportsModule />;
      case 'help-faqs':
      case 'contact-mentor':
        return <SupportModule />;
      default:
        return <StudentDashboardOverview />;
    }
  };

  return (
    <StudentDashboardLayout 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
    >
      {renderPage()}
    </StudentDashboardLayout>
  );
}