# Alert and Monitoring System - Future Feature Specification

## Executive Summary
This document outlines the design and implementation plan for an alert and monitoring system to track failed transactions, stuck predictions, and system health in the RestoreClick application.

## Problem Statement
Currently, there is no automated way to detect and alert on:
- Predictions stuck in processing state
- Failed payment transactions
- Database update failures
- Email delivery failures
- System performance degradation

## Proposed Solution

### 1. Alert Categories

#### Critical Alerts (Immediate Action Required)
- Payment processing failures
- Complete system outages
- Database connection failures
- Replicate API unavailability

#### High Priority Alerts (Action within 1 hour)
- Predictions stuck > 10 minutes
- Email delivery failures affecting > 5 customers
- Storage quota warnings (> 90% usage)

#### Medium Priority Alerts (Action within 24 hours)
- Individual email delivery failures
- Slow API response times
- Failed image uploads

### 2. Technical Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Supabase DB   │────▶│  Edge Functions  │────▶│ Alert Service   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                           │
                                ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Alert Queue    │     │  Notifications  │
                        └──────────────────┘     └─────────────────┘
```

### 3. Implementation Components

#### A. Database Schema Changes
```sql
-- Alert history table
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  entity_type VARCHAR(50),
  entity_id UUID,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT
);

-- Alert rules configuration
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  severity VARCHAR(20) NOT NULL,
  notification_channels JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_alert_history_created_at ON alert_history(created_at DESC);
CREATE INDEX idx_alert_history_entity ON alert_history(entity_type, entity_id);
CREATE INDEX idx_alert_history_unresolved ON alert_history(resolved_at) WHERE resolved_at IS NULL;
```

#### B. Supabase Edge Function for Monitoring
```typescript
// supabase/functions/monitor-predictions/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STUCK_THRESHOLD_MINUTES = 10;
const CHECK_INTERVAL_MINUTES = 5;

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Check for stuck predictions
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - STUCK_THRESHOLD_MINUTES);

  const { data: stuckPredictions, error } = await supabase
    .from('predictions')
    .select('*, orders!inner(customer_email, id)')
    .in('status', ['starting', 'processing'])
    .lt('created_at', cutoffTime.toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Process each stuck prediction
  for (const prediction of stuckPredictions || []) {
    await createAlert(supabase, {
      alert_type: 'stuck_prediction',
      severity: 'high',
      entity_type: 'prediction',
      entity_id: prediction.id,
      message: `Prediction ${prediction.replicate_id} stuck in ${prediction.status} state for over ${STUCK_THRESHOLD_MINUTES} minutes`,
      metadata: {
        prediction_id: prediction.id,
        replicate_id: prediction.replicate_id,
        order_id: prediction.order_id,
        customer_email: prediction.orders.customer_email,
        stuck_duration_minutes: Math.floor((Date.now() - new Date(prediction.created_at).getTime()) / 60000)
      }
    });
  }

  return new Response(JSON.stringify({ 
    checked: stuckPredictions?.length || 0,
    timestamp: new Date().toISOString() 
  }), { status: 200 });
});
```

#### C. Alert Notification Service
```typescript
// lib/alert-service.ts
interface AlertChannel {
  send(alert: Alert): Promise<void>;
}

class SlackAlertChannel implements AlertChannel {
  constructor(private webhookUrl: string) {}
  
  async send(alert: Alert): Promise<void> {
    const color = {
      critical: '#FF0000',
      high: '#FF9900',
      medium: '#FFCC00',
      low: '#00CC00'
    }[alert.severity];

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `${alert.severity.toUpperCase()}: ${alert.alert_type}`,
          text: alert.message,
          fields: Object.entries(alert.metadata || {}).map(([k, v]) => ({
            title: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: String(v),
            short: true
          })),
          footer: 'RestoreClick Alert System',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
  }
}

class EmailAlertChannel implements AlertChannel {
  async send(alert: Alert): Promise<void> {
    // Send email using SendGrid
    await sendEmail({
      to: process.env.ADMIN_EMAIL!,
      templateId: process.env.SENDGRID_ALERT_TEMPLATE_ID!,
      dynamicTemplateData: {
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        metadata: alert.metadata,
        timestamp: new Date().toISOString()
      }
    });
  }
}

class PagerDutyAlertChannel implements AlertChannel {
  constructor(private integrationKey: string) {}
  
  async send(alert: Alert): Promise<void> {
    if (alert.severity !== 'critical') return;
    
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: this.integrationKey,
        event_action: 'trigger',
        payload: {
          summary: alert.message,
          severity: 'error',
          source: 'restoreclick',
          custom_details: alert.metadata
        }
      })
    });
  }
}
```

### 4. Alert Dashboard UI

#### Admin Dashboard Components
```typescript
// app/admin/alerts/page.tsx
export default function AlertsDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Alerts</h1>
      
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <AlertSummaryCard severity="critical" count={criticalCount} />
        <AlertSummaryCard severity="high" count={highCount} />
        <AlertSummaryCard severity="medium" count={mediumCount} />
        <AlertSummaryCard severity="low" count={lowCount} />
      </div>
      
      {/* Active Alerts Table */}
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold p-4 border-b">Active Alerts</h2>
        <AlertsTable alerts={activeAlerts} onResolve={handleResolve} />
      </div>
      
      {/* Alert History */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold p-4 border-b">Alert History</h2>
        <AlertHistoryTable alerts={alertHistory} />
      </div>
    </div>
  );
}
```

### 5. Configuration and Deployment

#### Environment Variables
```env
# Alert System Configuration
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
ALERT_PAGERDUTY_KEY=xxx
ADMIN_EMAIL=admin@restoreclick.com
SENDGRID_ALERT_TEMPLATE_ID=d-xxx

# Alert Thresholds
STUCK_PREDICTION_THRESHOLD_MINUTES=10
PAYMENT_FAILURE_THRESHOLD_COUNT=3
API_RESPONSE_TIME_THRESHOLD_MS=5000
```

#### Deployment Steps
1. Create Supabase Edge Functions
2. Set up cron jobs for monitoring functions
3. Configure alert channels (Slack, Email, PagerDuty)
4. Deploy admin dashboard
5. Set up monitoring for the monitoring system itself

### 6. Alert Response Procedures

#### Stuck Prediction Alert
1. Check Replicate API status
2. Verify database connectivity
3. Attempt manual prediction status update
4. Contact customer if resolution takes > 30 minutes

#### Payment Failure Alert
1. Check Stripe dashboard for details
2. Verify webhook processing
3. Contact customer for payment retry
4. Escalate to payment team if pattern detected

### 7. Success Metrics

- **Alert Response Time**: < 5 minutes for critical alerts
- **False Positive Rate**: < 5% of total alerts
- **Resolution Time**: 
  - Critical: < 30 minutes
  - High: < 2 hours
  - Medium: < 24 hours
- **System Uptime**: 99.9% availability

### 8. Future Enhancements

1. **Machine Learning Integration**
   - Predict failures before they occur
   - Anomaly detection for unusual patterns
   - Auto-resolution for known issues

2. **Customer-Facing Status Page**
   - Real-time system status
   - Incident history
   - Scheduled maintenance notifications

3. **Advanced Analytics**
   - Alert trend analysis
   - Root cause correlation
   - Performance impact assessment

### 9. Implementation Timeline

- **Phase 1 (Week 1-2)**: Database schema and basic monitoring
- **Phase 2 (Week 3-4)**: Alert channels and notification system
- **Phase 3 (Week 5-6)**: Admin dashboard and procedures
- **Phase 4 (Week 7-8)**: Testing and optimization

### 10. Cost Estimation

- Supabase Edge Functions: ~$10/month
- Slack: Free tier sufficient
- PagerDuty: $21/user/month
- Development time: ~160 hours
- Ongoing maintenance: ~10 hours/month

## Conclusion

This alert and monitoring system will significantly improve system reliability and customer satisfaction by enabling proactive issue resolution. The modular design allows for incremental implementation and easy extension with new alert types and channels.
