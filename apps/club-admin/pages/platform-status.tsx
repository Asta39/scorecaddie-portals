// pages/platform-status.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlatformStatusCard } from "@/components/platform-status-card";
import { ErrorIndicator } from "@/components/error-indicator";

interface HealthMetrics {
  apiLatency: number;
  dbConnected: boolean;
  errorCount: number;
  errors: string[];
}

export default function PlatformStatusPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return <div className="p-4">Loading platform status...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Platform Status</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlatformStatusCard title="API Latency" value={`${metrics.apiLatency} ms`} />
        <PlatformStatusCard title="Database" value={metrics.dbConnected ? "Connected" : "Disconnected"} />
        <PlatformStatusCard title="Errors" value={metrics.errorCount.toString()} />
      </div>
      {metrics.errorCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {metrics.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
