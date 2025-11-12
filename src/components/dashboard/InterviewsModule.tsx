import React from 'react'

const InterviewsModule = () => {
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

export default InterviewsModule