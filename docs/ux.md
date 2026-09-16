# User Experience

The init tool provides a polished CLI experience with visual enhancements for usability and engagement.

## Visual Design

### Color Coding (chalk)

- **Cyan** - Headers, section titles, important labels
- **Green** - Success states, confirmations, checkmarks
- **Yellow** - User input prompts, warnings
- **Red** - Errors, failures
- **White** - Primary content, values
- **Gray/Dim** - Secondary info, hints, progress details

### Bordered Boxes (boxen)

Different border styles indicate different message types:

- **Round borders** - General information, summaries
- **Double borders** - Success messages, completion
- **Thick borders** - Errors, critical messages

### Progress Feedback (ora)

Animated spinners show progress during:

- File generation
- Template composition
- Overlay application
- Any async operations

### Professional CLI (commander)

- Built-in `--help` documentation
- Version information (`--version`)
- Clear option descriptions
- Automatic validation

## Interactive Flow

### Welcome Banner

Cyan-bordered box with centered title and subtitle, setting professional tone.

### Question Flow

Each question follows this pattern:

1. Bold cyan question with emoji number
2. List of options (if applicable)
3. Yellow prompt for input
4. Green checkmark with confirmation
5. Dim text showing selected value

### Configuration Summary

Green-bordered box showing all selections before generation:

- Stack choice
- Docker-in-Docker setting
- Database selection
- Playwright enabled/disabled
- Cloud tools list
- Output path

### Progress Indicators

Spinner animation with cyan text during generation, followed by dimmed progress messages for each overlay applied.

### Success Message

Double-bordered green box with:

- Bold success headline
- Next steps numbered list
- Note about configuration independence

### Error Handling

Red-bordered box with:

- Bold error headline
- Clear error message
- No raw stack traces

## Non-Interactive Mode

Same visual polish as interactive mode:

- Blue box indicating non-interactive mode
- Configuration summary box
- Spinner during generation
- Success/error boxes

Professional help text via `--help` with clear option descriptions and examples.

## Design Principles

### Progressive Disclosure

Show one question at a time, confirm each selection, summarize before execution.

### Visual Hierarchy

- Bold for headers
- Dim for secondary info
- Color for message types
- Boxes for important sections

### Immediate Feedback

- Checkmarks confirm selections
- Spinners show progress
- Clear success/error states
- No silent operations

### Scannability

- Emoji markers for sections
- Consistent indentation
- Grouped related information
- Clear visual separation

### Professional Polish

- No raw errors
- Friendly messages
- Helpful next steps
- Acknowledgment of independence

## Libraries

| Library                 | Purpose          | Usage              |
| ----------------------- | ---------------- | ------------------ |
| **chalk** (^5.3.0)      | Terminal styling | Colors, bold, dim  |
| **boxen** (^7.1.1)      | Terminal boxes   | Headers, summaries |
| **ora** (^8.0.1)        | Spinners         | Progress feedback  |
| **commander** (^12.0.0) | CLI parsing      | Arguments, help    |

## Accessibility

### Terminal Compatibility

Works across different terminals:

- Modern terminals (full color, Unicode)
- Basic terminals (ASCII fallbacks)
- CI environments (no animation)

### Graceful Degradation

If terminal doesn't support:

- Colors → plain text
- Spinners → simple dots
- Unicode → ASCII characters

The tool remains fully functional.

## Philosophy Alignment

Visual enhancements maintain humble tool principles:

- ✅ No lock-in - Pretty output is ephemeral
- ✅ Stateless - Visual feedback doesn't persist
- ✅ Optional - Non-interactive mode available
- ✅ Simple - UX aids clarity, not complexity

Beautiful interface, simple implementation.
