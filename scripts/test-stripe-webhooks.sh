#!/bin/bash

# Stripe Webhook Integration Test Script
# This script helps test Stripe webhooks using Stripe CLI and ngrok

set -e

echo "🚀 Starting Stripe Webhook Integration Tests"

# Check if required tools are installed
command -v stripe >/dev/null 2>&1 || { echo "❌ Stripe CLI is required but not installed. Aborting." >&2; exit 1; }
command -v ngrok >/dev/null 2>&1 || { echo "❌ ngrok is required but not installed. Aborting." >&2; exit 1; }

# Configuration
LOCAL_PORT=3001
WEBHOOK_ENDPOINT="/api/webhooks/stripe"

echo "📋 Configuration:"
echo "  Local Port: $LOCAL_PORT"
echo "  Webhook Endpoint: $WEBHOOK_ENDPOINT"

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null || true
    fi
    if [ ! -z "$STRIPE_LISTEN_PID" ]; then
        kill $STRIPE_LISTEN_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Check if development server is running
echo "🔍 Checking if development server is running on port $LOCAL_PORT..."
if ! curl -s http://localhost:$LOCAL_PORT > /dev/null; then
    echo "❌ Development server is not running on port $LOCAL_PORT"
    echo "   Please start it with: npm run dev"
    exit 1
fi
echo "✅ Development server is running"

# Start ngrok in background
echo "🌐 Starting ngrok tunnel..."
ngrok http $LOCAL_PORT --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start and get the URL
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "")

if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
    echo "❌ Failed to get ngrok URL. Check if ngrok is running properly."
    cat ngrok.log
    exit 1
fi

echo "✅ ngrok tunnel established: $NGROK_URL"

# Start Stripe webhook forwarding
echo "🎯 Starting Stripe webhook forwarding..."
WEBHOOK_URL="$NGROK_URL$WEBHOOK_ENDPOINT"
echo "   Forwarding to: $WEBHOOK_URL"

stripe listen --forward-to $WEBHOOK_URL > stripe-listen.log 2>&1 &
STRIPE_LISTEN_PID=$!

# Wait for Stripe CLI to start
sleep 3

# Extract webhook secret from logs - improved pattern matching
WEBHOOK_SECRET=$(grep -o 'whsec_[a-zA-Z0-9]*' stripe-listen.log | head -1 || echo "")

# If that doesn't work, try alternative patterns
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(grep -o 'signing secret is whsec_[a-zA-Z0-9]*' stripe-listen.log | sed 's/signing secret is //' | head -1 || echo "")
fi

# If still empty, try to get it from the full line
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(grep 'webhook signing secret' stripe-listen.log | grep -o 'whsec_[a-zA-Z0-9]*' | head -1 || echo "")
fi

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ Failed to get webhook secret from Stripe CLI"
    cat stripe-listen.log
    exit 1
fi

echo "✅ Stripe webhook forwarding started"
echo "🔑 Webhook Secret: $WEBHOOK_SECRET"
echo ""
echo "📝 Add this to your .env.local file:"
echo "STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""

# Function to test webhook
test_webhook() {
    local event_type=$1
    echo "🧪 Testing webhook: $event_type"
    
    if stripe trigger $event_type; then
        echo "✅ Successfully triggered $event_type"
        echo "   Check your server logs for processing details"
    else
        echo "❌ Failed to trigger $event_type"
    fi
    echo ""
}

# Run webhook tests
echo "🎯 Running webhook tests..."
echo ""

# Test checkout session completed
test_webhook "checkout.session.completed"

# Wait a bit between tests
sleep 2

# Test payment intent succeeded
test_webhook "payment_intent.succeeded"

# Wait a bit between tests
sleep 2

# Test payment intent failed
test_webhook "payment_intent.payment_failed"

echo "🎉 Webhook tests completed!"
echo ""
echo "📊 Check the following for verification:"
echo "  1. Server logs for webhook processing"
echo "  2. Database for created orders/customers"
echo "  3. Email queue for queued messages"
echo "  4. Storage service for file operations"
echo ""
echo "🔍 View Stripe webhook logs:"
echo "  stripe events list --limit 10"
echo ""
echo "⏸️  Press Ctrl+C to stop the webhook forwarding"

# Keep the script running
while true; do
    sleep 1
done
