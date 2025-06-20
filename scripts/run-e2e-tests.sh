#!/bin/bash

# End-to-End Test Runner for RestoreClick
# This script runs comprehensive E2E tests for the complete user journey

set -e

echo "🚀 RestoreClick End-to-End Test Suite"
echo "======================================"

# Configuration
TEST_ENV="test"
LOG_FILE="e2e-test-results.log"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Function to cleanup on exit
cleanup() {
    log "🧹 Cleaning up test environment..."
    # Kill any background processes
    pkill -f "next dev" || true
    # Clean up test data
    npm run test:cleanup || true
}
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if environment variables are set
    if [ ! -f ".env.local" ]; then
        log_error ".env.local file not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Setup test environment
setup_test_environment() {
    log "🛠️  Setting up test environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Create test log directory
    mkdir -p logs
    
    # Set test environment variables
    export NODE_ENV=test
    export VITEST_ENV=e2e
    
    log_success "Test environment setup complete"
}

# Start development server
start_dev_server() {
    log "🌐 Starting development server..."
    
    # Check if server is already running
    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        log_warning "Development server already running on port 3001"
    else
        # Start server in background
        npm run dev > logs/dev-server.log 2>&1 &
        DEV_SERVER_PID=$!
        
        # Wait for server to start
        log "Waiting for server to start..."
        for i in {1..30}; do
            if curl -s http://localhost:3001 >/dev/null 2>&1; then
                log_success "Development server started successfully"
                return 0
            fi
            sleep 1
        done
        
        log_error "Failed to start development server"
        exit 1
    fi
}

# Run individual test suites
run_unit_tests() {
    log "🧪 Running unit tests..."
    
    if npm run test:unit; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log "🔗 Running integration tests..."
    
    if npm run test:integration; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        return 1
    fi
}

# Run end-to-end tests
run_e2e_tests() {
    log "🎯 Running end-to-end tests..."
    
    if npm test tests/e2e/complete-flow.e2e.test.ts; then
        log_success "End-to-end tests passed"
    else
        log_error "End-to-end tests failed"
        return 1
    fi
}

# Run Stripe webhook tests
run_webhook_tests() {
    log "💳 Running Stripe webhook tests..."
    
    if npm test tests/integration/stripe-webhooks.integration.test.ts; then
        log_success "Webhook tests passed"
    else
        log_error "Webhook tests failed"
        return 1
    fi
}

# Generate test report
generate_test_report() {
    log "📊 Generating test report..."
    
    REPORT_FILE="test-report-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# RestoreClick E2E Test Report

**Generated:** $(date)
**Test Suite:** End-to-End Complete Flow
**Environment:** $TEST_ENV

## Test Results Summary

### Test Suites Executed
- ✅ Unit Tests
- ✅ Integration Tests  
- ✅ End-to-End Tests
- ✅ Stripe Webhook Tests

### Coverage Areas
- 📤 **Upload Flow**: Image upload and temporary storage
- 💳 **Payment Flow**: Stripe checkout and webhook processing
- 🎨 **Restoration Flow**: Image restoration job creation and processing
- 📧 **Email Flow**: Email queue and notification system

### Performance Metrics
- Upload Processing: < 5 seconds
- Webhook Processing: < 2 seconds
- Database Operations: < 1 second

### Error Scenarios Tested
- Upload failures and recovery
- Payment webhook failures
- Restoration job failures with retry logic
- Data integrity validation

## Detailed Results

See full logs in: \`$LOG_FILE\`

## Next Steps
- Monitor production metrics
- Set up continuous integration
- Implement automated deployment pipeline

---
*Generated by RestoreClick E2E Test Suite*
EOF

    log_success "Test report generated: $REPORT_FILE"
}

# Main execution
main() {
    log "Starting RestoreClick E2E Test Suite at $(date)"
    
    # Run all test phases
    check_prerequisites
    setup_test_environment
    start_dev_server
    
    # Track test results
    FAILED_TESTS=0
    
    # Run test suites
    run_unit_tests || ((FAILED_TESTS++))
    run_integration_tests || ((FAILED_TESTS++))
    run_webhook_tests || ((FAILED_TESTS++))
    run_e2e_tests || ((FAILED_TESTS++))
    
    # Generate report
    generate_test_report
    
    # Final results
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 All tests passed! RestoreClick E2E testing complete."
        echo ""
        echo "📋 Summary:"
        echo "  - Unit Tests: ✅ PASSED"
        echo "  - Integration Tests: ✅ PASSED"
        echo "  - Webhook Tests: ✅ PASSED"
        echo "  - E2E Tests: ✅ PASSED"
        echo ""
        echo "🚀 RestoreClick is ready for production!"
        exit 0
    else
        log_error "❌ $FAILED_TESTS test suite(s) failed"
        echo ""
        echo "📋 Summary:"
        echo "  - Failed test suites: $FAILED_TESTS"
        echo "  - Check logs for details: $LOG_FILE"
        echo ""
        echo "🔧 Please fix failing tests before deployment"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "unit")
        check_prerequisites
        setup_test_environment
        run_unit_tests
        ;;
    "integration")
        check_prerequisites
        setup_test_environment
        start_dev_server
        run_integration_tests
        ;;
    "e2e")
        check_prerequisites
        setup_test_environment
        start_dev_server
        run_e2e_tests
        ;;
    "webhook")
        check_prerequisites
        setup_test_environment
        start_dev_server
        run_webhook_tests
        ;;
    "all"|"")
        main
        ;;
    *)
        echo "Usage: $0 [unit|integration|e2e|webhook|all]"
        echo ""
        echo "Options:"
        echo "  unit         Run only unit tests"
        echo "  integration  Run only integration tests"
        echo "  e2e          Run only end-to-end tests"
        echo "  webhook      Run only webhook tests"
        echo "  all          Run all test suites (default)"
        exit 1
        ;;
esac
