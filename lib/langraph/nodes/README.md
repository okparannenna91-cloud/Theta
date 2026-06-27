# LangGraph Nodes

Modular state machine nodes for the Nova AI agent.

## Pipeline
Input → evaluateDecision() → routeRequest() → tryDirectAction() → loadWorkspaceContext() → loadMemory() → executeTool() → executeWithProvider() → validateAndSanitize() → optimizeResponse()

## Usage
```typescript
import { evaluateDecision } from "./nodes/evaluateDecision";
import { loadWorkspaceContext } from "./nodes/context-loader";
```
