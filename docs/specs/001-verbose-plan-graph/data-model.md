# Data Model: Verbose Plan Graph

## Entity: PlanRequest

**Purpose**: Describes a single `plan` invocation and the presentation options that shape the response.

**Fields**:

- `stack`: requested base template type
- `selectedOverlayIds`: user-provided overlay IDs after trimming and de-duplication
- `manifestPath`: optional path to an existing `superposition.json` manifest
- `manifestOverlayIds`: overlays loaded from a manifest when manifest-driven planning is used
- `portOffset`: optional numeric port offset
- `jsonRequested`: whether structured output is requested
- `diffRequested`: whether diff mode is requested
- `verboseRequested`: whether dependency narration is requested
- `outputPath`: optional comparison target for diff mode

**Validation rules**:

- `stack` must be present and valid for the command
- `selectedOverlayIds` must contain only known overlay IDs
- duplicate overlay IDs are normalized before planning
- manifest-driven requests must resolve to a valid manifest before explanation data is generated
- `verboseRequested` must not change resolution behavior, only presentation and additional metadata

## Entity: IncludedOverlay

**Purpose**: Represents one overlay that appears in the resolved final plan.

**Fields**:

- `id`: stable overlay identifier
- `displayName`: human-readable overlay name if available
- `selectionKind`: `direct` or `dependency` based on how the overlay first entered the resolved set
- `selectionSource`: `command-line`, `manifest`, or `dependency`
- `reasons`: one or more inclusion reasons attached to this overlay
- `dependencyPaths`: one or more ordered paths from a direct selection to this overlay
- `compatibleWithStack`: whether the overlay remains in the final stack-specific plan

**Validation rules**:

- each included overlay appears only once in the final resolved set
- `reasons` must contain at least one entry
- `dependencyPaths` may have multiple entries when multiple parents lead to the same overlay
- if `selectionKind` is `direct`, at least one reason must identify the user request as the source
- if `selectionSource` is `manifest`, at least one reason must identify the manifest-defined root set as the source

## Entity: InclusionReason

**Purpose**: Explains why a single overlay was kept in the plan.

**Fields**:

- `kind`: `selected`, `required`, `transitive`, or `skipped`
- `origin`: `command-line` or `manifest`
- `sourceOverlayId`: the overlay that directly caused this reason, if applicable
- `rootOverlayId`: the original user-selected overlay at the start of the path
- `message`: user-facing explanation text
- `depth`: number of dependency edges between the root selection and the included overlay

**Validation rules**:

- direct selections use `kind: selected` and `depth: 0`
- manifest-defined root overlays also use `kind: selected` and `depth: 0`
- dependency-driven inclusions must include `sourceOverlayId`
- transitive reasons must include both `sourceOverlayId` and `rootOverlayId`
- failure or skip reasons must remain attached to the affected overlay or attempted overlay so users can identify the boundary condition

## Entity: DependencyPath

**Purpose**: Captures the ordered chain from a requested overlay to an included dependency.

**Fields**:

- `rootOverlayId`: directly selected starting overlay
- `segments`: ordered overlay IDs showing the path from root to final overlay
- `finalOverlayId`: included overlay reached by the path

**Validation rules**:

- `segments[0]` must match `rootOverlayId`
- `segments[segments.length - 1]` must match `finalOverlayId`
- repeated paths for the same overlay should be de-duplicated before output

## Entity: VerbosePlanOutput

**Purpose**: Extends the standard plan result with explanation data when verbose mode is requested.

**Fields**:

- `standardPlan`: the existing plan summary data
- `includedOverlays`: ordered list of `IncludedOverlay` records for human and JSON rendering
- `resolutionSummary`: concise summary of how many overlays were selected directly vs added automatically
- `failureContext`: optional description of the point where planning stopped or skipped overlays
- `inputMode`: `overlay-list` or `manifest`

**Relationships**:

- one `PlanRequest` produces one `VerbosePlanOutput`
- one `PlanRequest` may be sourced from explicit overlay flags or a manifest
- one `VerbosePlanOutput` contains many `IncludedOverlay` records
- one `IncludedOverlay` contains many `InclusionReason` records and zero or more `DependencyPath` records

## State Notes

- Resolution begins with the user-selected overlays.
- Resolution begins with either the user-selected overlays or the manifest-defined overlay roots.
- Dependencies are added recursively as required relationships are traversed.
- Stack compatibility filtering may remove overlays from the final renderable set after dependency discovery.
- Conflict detection runs against the resolved compatible set and may attach failure context to the verbose result.
