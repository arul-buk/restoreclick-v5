# RestoreClick Data Flow Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend"
        UI[Web UI]
        Upload[Upload Component]
        Payment[Payment Component]
        Success[Success Page]
    end
    
    subgraph "API Layer"
        UploadAPI[Upload API]
        PaymentAPI[Payment API]
        WebhookAPI[Webhook API]
        RestoreAPI[Restoration API]
        DownloadAPI[Download API]
        EmailAPI[Email API]
    end
    
    subgraph "Storage"
        TempStorage[Temp Storage]
        OrigStorage[Original Storage]
        RestStorage[Restored Storage]
    end
    
    subgraph "External Services"
        Stripe[Stripe]
        Replicate[Replicate AI]
        SendGrid[SendGrid]
    end
    
    subgraph "Database"
        Customers[Customers]
        Orders[Orders]
        Images[Images]
        Jobs[Restoration Jobs]
        EmailQueue[Email Queue]
    end
    
    subgraph "Background Workers"
        RestoreWorker[Restoration Worker]
        EmailWorker[Email Worker]
        CleanupWorker[Cleanup Worker]
    end
```

## Detailed Flow Diagrams

### 1. Complete User Journey

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Storage
    participant Database
    participant Stripe
    participant Workers
    participant Replicate
    participant SendGrid
    
    %% Upload Phase
    User->>Frontend: Select images
    Frontend->>API: POST /api/upload
    API->>Storage: Store in temp/{session_id}
    API->>Database: Create file_uploads records
    API-->>Frontend: Return session_id
    
    %% Payment Phase
    User->>Frontend: Proceed to payment
    Frontend->>Stripe: Create checkout session
    User->>Stripe: Complete payment
    Stripe->>API: Webhook: payment.success
    
    %% Order Processing
    API->>Database: Create customer (if new)
    API->>Database: Create order
    API->>Storage: Move temp → originals/{order_id}
    API->>Database: Create image records
    API->>Database: Create restoration_jobs
    API->>Database: Queue order confirmation email
    
    %% Restoration Phase
    Workers->>Database: Poll restoration_jobs
    Workers->>Replicate: Submit restoration request
    Replicate-->>Workers: Return job_id
    Workers->>Database: Update job with external_id
    
    loop Poll until complete
        Workers->>Replicate: Check status
        Replicate-->>Workers: Return status
    end
    
    Workers->>Storage: Download & store in restored/{order_id}
    Workers->>Database: Update image & job records
    Workers->>Database: Queue completion email
    
    %% Email Delivery
    Workers->>Database: Poll email_queue
    Workers->>Storage: Fetch attachments
    Workers->>SendGrid: Send email
    SendGrid-->>Workers: Delivery status
    Workers->>Database: Update email status
    
    %% User Access
    User->>Frontend: Access success page
    Frontend->>API: GET /api/orders/{id}
    API->>Database: Fetch order & images
    API-->>Frontend: Return data
    Frontend-->>User: Display results
```

### 2. Image Upload Flow

```mermaid
flowchart LR
    A[User Selects Images] --> B{Validate Images}
    B -->|Valid| C[Generate Session ID]
    B -->|Invalid| D[Show Error]
    C --> E[Upload to Temp Storage]
    E --> F[Create Upload Records]
    F --> G[Return Session Info]
    
    subgraph "Temp Storage Structure"
        H[uploads/temp/session_id/image1.jpg]
        I[uploads/temp/session_id/image2.jpg]
    end
    
    E --> H
    E --> I
```

### 3. Payment Processing Flow

```mermaid
flowchart TB
    A[Stripe Webhook] --> B{Verify Signature}
    B -->|Invalid| C[Reject]
    B -->|Valid| D{Check Idempotency}
    D -->|Duplicate| E[Return Success]
    D -->|New| F[Create Order]
    
    F --> G[Move Images]
    G --> H[Create Image Records]
    H --> I[Queue Restorations]
    I --> J[Queue Email]
    J --> K[Return Success]
    
    subgraph "Image Movement"
        L[temp/session_id/] --> M[originals/order_id/]
    end
    
    G --> L
    L --> M
```

### 4. Restoration Processing Flow

```mermaid
stateDiagram-v2
    [*] --> Pending: Job Created
    Pending --> Queued: Worker Picks Up
    Queued --> Processing: Replicate Started
    Processing --> Completed: Success
    Processing --> Failed: Error
    Failed --> Queued: Retry
    Failed --> [*]: Max Retries
    Completed --> [*]: Done
    
    note right of Processing
        Poll Replicate API
        Update progress
    end note
    
    note right of Failed
        Exponential backoff
        Track error details
    end note
```

### 5. Email Queue Processing

```mermaid
flowchart LR
    A[Email Event] --> B[Create Queue Entry]
    B --> C{Worker Available?}
    C -->|Yes| D[Process Email]
    C -->|No| E[Wait in Queue]
    E --> C
    
    D --> F[Gather Attachments]
    F --> G[Build Template Data]
    G --> H[Send via SendGrid]
    H --> I{Success?}
    I -->|Yes| J[Mark Sent]
    I -->|No| K{Retry?}
    K -->|Yes| L[Backoff & Retry]
    K -->|No| M[Mark Failed]
    L --> D
```

### 6. Storage Structure

```
photos/
├── uploads/
│   ├── temp/
│   │   └── {session_id}/
│   │       ├── image1.jpg
│   │       └── image2.jpg
│   ├── originals/
│   │   └── {order_id}/
│   │       ├── IMG_001_original.jpg
│   │       └── IMG_002_original.jpg
│   └── restored/
│       └── {order_id}/
│           ├── IMG_001_restored.jpg
│           └── IMG_002_restored.jpg
└── downloads/
    └── {order_id}/
        └── {timestamp}_all_photos.zip
```

### 7. Database State Transitions

```mermaid
graph TD
    subgraph "Order States"
        OP[pending_payment] --> OPR[processing]
        OPR --> OC[completed]
        OPR --> OF[failed]
        OP --> OR[refunded]
    end
    
    subgraph "Image States"
        IP[pending] --> IU[uploaded]
        IU --> IPR[processing]
        IPR --> IC[completed]
        IPR --> IF[failed]
    end
    
    subgraph "Job States"
        JP[pending] --> JQ[queued]
        JQ --> JPR[processing]
        JPR --> JC[completed]
        JPR --> JF[failed]
        JF --> JQ
    end
    
    subgraph "Email States"
        EP[pending] --> ES[sending]
        ES --> ESE[sent]
        ES --> EF[failed]
        EF --> EP
    end
```

## Error Handling Flows

### Restoration Failure Recovery

```mermaid
flowchart TB
    A[Restoration Failed] --> B{Retry Count?}
    B -->|< Max| C[Exponential Backoff]
    B -->|>= Max| D[Mark Failed]
    C --> E[Wait Period]
    E --> F[Retry Job]
    D --> G[Notify Admin]
    D --> H[Email Customer]
    
    subgraph "Backoff Strategy"
        I[Attempt 1: 1s]
        J[Attempt 2: 2s]
        K[Attempt 3: 4s]
    end
```

### Payment Failure Handling

```mermaid
flowchart LR
    A[Payment Failed] --> B[Keep Images in Temp]
    B --> C[Set Expiry Timer]
    C --> D{Customer Action?}
    D -->|Retry Payment| E[Resume Flow]
    D -->|Abandon| F[Cleanup After 24h]
    E --> G[Process Order]
```

## Security Considerations

### Download Token Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Database
    participant Storage
    
    User->>API: Request download
    API->>Database: Create download_link
    Database-->>API: Return token
    API-->>User: Download URL with token
    
    User->>API: GET /download/{token}
    API->>Database: Validate token
    
    alt Token Valid
        API->>Storage: Stream files
        Storage-->>User: File data
        API->>Database: Increment counter
    else Token Invalid/Expired
        API-->>User: 403 Forbidden
    end
```

## Monitoring & Alerts

### System Health Checks

```mermaid
graph TB
    subgraph "Monitors"
        M1[Queue Depth Monitor]
        M2[Processing Time Monitor]
        M3[Error Rate Monitor]
        M4[Storage Usage Monitor]
    end
    
    subgraph "Alerts"
        A1[Queue Backup Alert]
        A2[Slow Processing Alert]
        A3[High Error Rate Alert]
        A4[Storage Limit Alert]
    end
    
    subgraph "Actions"
        AC1[Scale Workers]
        AC2[Investigate Errors]
        AC3[Clean Old Files]
    end
    
    M1 --> A1 --> AC1
    M2 --> A2 --> AC2
    M3 --> A3 --> AC2
    M4 --> A4 --> AC3
```

## Implementation Notes

1. **Idempotency**: All operations must be idempotent using unique keys
2. **Transactions**: Use database transactions for multi-step operations
3. **Timeouts**: Set appropriate timeouts for external API calls
4. **Logging**: Comprehensive logging at each step for debugging
5. **Metrics**: Track key metrics for performance monitoring
6. **Cleanup**: Automated cleanup of temporary files and expired data
