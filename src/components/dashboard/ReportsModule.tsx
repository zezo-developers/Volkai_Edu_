import React from 'react'

const ReportsModule = () => {
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

export default ReportsModule