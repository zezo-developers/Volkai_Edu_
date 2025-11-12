import React from 'react'

const SettingsModule = () => {
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

export default SettingsModule