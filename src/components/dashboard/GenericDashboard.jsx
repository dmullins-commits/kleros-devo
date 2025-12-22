import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, Clock, Shield, Zap } from "lucide-react";

export default function GenericDashboard() {
  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="relative mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-yellow-600/5 blur-3xl" />
          <div className="relative z-10 text-center py-16">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Crown className="w-20 h-20 text-yellow-400" />
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-30 animate-pulse" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
              WELCOME
            </h1>
            <p className="text-gray-300 text-xl font-medium tracking-wide mb-8">
              Your account is being set up
            </p>
          </div>
        </div>

        <Alert className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-yellow-400/30 mb-8">
          <Clock className="h-5 w-5 text-yellow-400" />
          <AlertDescription className="text-gray-300">
            <p className="font-bold text-lg mb-2 text-white">Account Setup in Progress</p>
            <p className="mb-3">
              An administrator will assign you to your organization shortly. 
              Once assigned, you'll have full access to all performance tracking features.
            </p>
            <p className="text-sm text-gray-400">
              If you have questions, please contact your system administrator.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-gray-800 hover:border-yellow-400/30 transition-all">
            <CardHeader>
              <CardTitle className="text-white font-black flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 rounded-lg">
                  <Shield className="w-6 h-6 text-yellow-400" />
                </div>
                Secure Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your account is protected and will be granted appropriate permissions by your administrator.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-gray-800 hover:border-yellow-400/30 transition-all">
            <CardHeader>
              <CardTitle className="text-white font-black flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 rounded-lg">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                Performance Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm leading-relaxed">
                Track metrics, analyze progress, and manage athlete performance with powerful tools.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-gray-800 hover:border-yellow-400/30 transition-all">
            <CardHeader>
              <CardTitle className="text-white font-black flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 rounded-lg">
                  <Crown className="w-6 h-6 text-yellow-400" />
                </div>
                Elite Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm leading-relaxed">
                Join coaches and athletes using our comprehensive performance management system.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/30 rounded-lg">
            <p className="text-yellow-400 font-bold">
              Waiting for administrator approval...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}