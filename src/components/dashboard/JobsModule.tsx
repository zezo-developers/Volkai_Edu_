import React from 'react'

const JobsModule = () => {
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

export default JobsModule