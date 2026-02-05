# Service Dependencies and Startup Order

## Overview

The overlay system supports service dependencies through `depends_on` in docker-compose files and `runServices` arrays in devcontainer.json. The composer must intelligently handle these when merging overlays.

## Dependency Graph

```
postgres, redis (base infrastructure)
  ↓
jaeger, prometheus, loki (observability backends)
  ↓
otel-collector (telemetry pipeline)
  ↓
grafana (visualization)
  ↓
devcontainer (main application)
```

## Service Order Hints

Overlays use `_serviceOrder` (custom field, non-standard) to indicate startup priority:

- **Order 0** (implicit): postgres, redis - base infrastructure
- **Order 1**: jaeger, prometheus, loki - observability backends
- **Order 2**: otel-collector - telemetry collection
- **Order 3**: grafana - visualization layer

The devcontainer service should start last, after all selected infrastructure.

## Docker Compose depends_on

### Static Dependencies (in overlay files)

Each overlay's docker-compose.yml includes ALL potential dependencies:

**otel-collector/docker-compose.yml:**
```yaml
services:
  otel-collector:
    depends_on:
      - jaeger
      - prometheus
      - loki
```

**grafana/docker-compose.yml:**
```yaml
services:
  grafana:
    depends_on:
      - prometheus
      - loki
      - jaeger
```

**compose/docker-compose.yml:**
```yaml
services:
  devcontainer:
    depends_on:
      - postgres
      - redis
      - otel-collector
```

### Composer Responsibility

The composer MUST:

1. **Filter depends_on** - Remove dependencies for services not selected
   ```javascript
   // If jaeger is not selected, remove it from otel-collector's depends_on
   if (!selectedOverlays.includes('jaeger')) {
     delete services['otel-collector'].depends_on['jaeger'];
   }
   ```

2. **Clean empty depends_on** - Remove the field if no dependencies remain
   ```javascript
   if (Object.keys(service.depends_on).length === 0) {
     delete service.depends_on;
   }
   ```

3. **Validate dependency chain** - Ensure no circular dependencies
4. **Order docker-compose files** - Merge in dependency order to avoid forward references

## runServices Array

The `runServices` array in devcontainer.json controls which services start automatically.

### Overlay Definitions

Each overlay declares its service(s):

```json
// postgres/devcontainer.patch.json
{
  "runServices": ["postgres"]
}

// otel-collector/devcontainer.patch.json
{
  "runServices": ["otel-collector"],
  "_serviceOrder": 2
}
```

### Composer Merge Strategy

When merging `runServices`:

1. **Collect all services** from base template + selected overlays
2. **Sort by _serviceOrder** (ascending)
3. **Merge into single array** maintaining order
4. **Remove duplicates** while preserving order

**Example merge:**
```javascript
// Selected overlays: postgres, redis, jaeger, prometheus, otel-collector, grafana
const runServices = [
  // Order 0 (infrastructure)
  'postgres',
  'redis',
  // Order 1 (observability backends)
  'jaeger',
  'prometheus',
  // Order 2 (telemetry pipeline)
  'otel-collector',
  // Order 3 (visualization)
  'grafana'
];
```

The devcontainer service itself is NOT in runServices (it's the main service).

## Implementation Example

```typescript
interface Overlay {
  name: string;
  devcontainer: {
    runServices?: string[];
    _serviceOrder?: number;
  };
  dockerCompose?: {
    services: Record<string, {
      depends_on?: string[];
      // ... other fields
    }>;
  };
}

function mergeOverlays(baseTemplate: any, overlays: Overlay[]) {
  const selectedServices = new Set(overlays.map(o => o.name));
  const result = { ...baseTemplate };
  
  // 1. Merge runServices with ordering
  const servicesByOrder = overlays
    .flatMap(o => (o.devcontainer.runServices || []).map(s => ({
      name: s,
      order: o.devcontainer._serviceOrder || 0
    })))
    .sort((a, b) => a.order - b.order);
  
  result.runServices = [...new Set(servicesByOrder.map(s => s.name))];
  
  // 2. Merge docker-compose and filter depends_on
  for (const overlay of overlays) {
    if (!overlay.dockerCompose) continue;
    
    for (const [serviceName, service] of Object.entries(overlay.dockerCompose.services)) {
      if (service.depends_on) {
        // Filter out unselected dependencies
        service.depends_on = service.depends_on.filter(dep => 
          selectedServices.has(dep)
        );
        
        // Remove empty depends_on
        if (service.depends_on.length === 0) {
          delete service.depends_on;
        }
      }
      
      // Merge service definition
      result.services[serviceName] = {
        ...result.services[serviceName],
        ...service
      };
    }
  }
  
  return result;
}
```

## Edge Cases

### Partial Observability Stack

If user selects only some observability tools:

**Selection:** otel-collector + prometheus (no jaeger, no loki)

**Result:**
```yaml
# otel-collector depends only on prometheus
services:
  otel-collector:
    depends_on:
      - prometheus  # jaeger and loki removed
```

### No Dependencies

If a service has no selected dependencies:

**Selection:** jaeger only (standalone)

**Result:**
```yaml
# jaeger has no depends_on (removed entirely)
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    # no depends_on field
```

### Devcontainer Dependencies

The main devcontainer service depends on all infrastructure:

**Selection:** postgres + otel-collector

**Result:**
```yaml
services:
  devcontainer:
    depends_on:
      - postgres
      - otel-collector
    # redis removed (not selected)
```

## Validation

The composer should validate:

1. ✅ No circular dependencies
2. ✅ All dependencies in depends_on exist as services
3. ✅ runServices order matches dependency graph
4. ✅ No orphaned services (defined but not in runServices or depended upon)

## Testing Scenarios

Test these combinations:

1. **Full stack**: postgres + redis + jaeger + prometheus + loki + otel-collector + grafana
2. **Minimal**: postgres only
3. **Partial observability**: prometheus + grafana (no otel-collector)
4. **Trace-only**: jaeger + otel-collector (no metrics)
5. **Metrics-only**: prometheus + otel-collector (no tracing)
6. **Direct to backends**: jaeger + prometheus + loki (no otel-collector)

Each should produce valid docker-compose with correct dependencies.
