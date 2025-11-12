import React from 'react'

const CommunicationModule = () => {
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

export default CommunicationModule