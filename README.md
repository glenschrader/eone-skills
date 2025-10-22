# Claude Code Skills

A collection of custom Claude Code skills.

## Skills

### ADO Pipelines

Comprehensive skill for interacting with Azure DevOps (ADO) pipelines and builds.

**Features:**
- Pipeline status monitoring
- Test results analysis
- Failure investigation and code correlation
- Cross-branch flakiness detection
- Helper scripts for formatting and analysis

[View full documentation](./ado-pipelines/README.md)

## Installation

### Via Claude Code Plugin System

```bash
# Install from GitHub
claude-code plugin install https://github.com/glenschrader/claude-skills
```

### Manual Installation

1. Clone this repository to your Claude Code skills folder:
   ```bash
   git clone https://github.com/glenschrader/claude-skills ~/.claude/skills/custom-skills
   ```

2. The skills will be automatically loaded by Claude Code

## Prerequisites

- Claude Code installed
- Azure CLI with DevOps extension (for ado-pipelines skill)
- Node.js (for helper scripts)

## Contributing

Feel free to submit issues or pull requests for improvements or new skills.

## License

MIT License - See individual skill directories for more details.

## Author

Glen Schrader
