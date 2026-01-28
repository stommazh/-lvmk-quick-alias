---
name: skill-creator
description: Guide for creating effective Antigravity skills, adding skill references, skill scripts or optimizing existing skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends the agent's capabilities with specialized knowledge, workflows, frameworks, libraries or plugins usage, or API and tool integrations.
---

# Skill Creator for Antigravity

This skill provides guidance for creating effective Antigravity skills.

## About Skills

Skills are modular, self-contained packages that extend the agent's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform the agent from a general-purpose assistant into a specialized agent equipped with procedural knowledge.

**IMPORTANT:**
- Skills are not documentation, they are practical instructions for the agent to use tools, packages, plugins or APIs to achieve tasks.
- Each skill teaches the agent how to perform a specific development task, not what a tool does.
- The agent can activate multiple skills automatically based on the user's request.

### Skill Locations

Antigravity searches for skills in two primary locations:
- **Global Usage:** `~/.gemini/antigravity/skills/<skill-folder>/`
- **Workspace Specific:** `<workspace-root>/.agent/skills/<skill-folder>/`

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
~/.gemini/antigravity/skills/
└── skill-name/
    ├── SKILL.md (required)
    │   ├── YAML frontmatter metadata (required)
    │   │   ├── name: (optional)
    │   │   └── description: (required)
    │   └── Markdown instructions (required)
    └── Bundled Resources (optional)
        ├── scripts/          - Executable code (Python/Bash/etc.)
        ├── references/       - Documentation intended to be loaded into context as needed
        └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### Requirements (**IMPORTANT**)

- `SKILL.md` should be **concise** and include references to related markdown files and scripts.
- Descriptions in metadata should be both concise and contain enough use cases to enable automatic skill activation.
- **Referenced scripts:**
  - Prefer nodejs or python scripts instead of bash script for cross-platform compatibility.
  - If writing python scripts, include `requirements.txt` if dependencies are needed.
  - Always write tests for scripts.

#### SKILL.md (required)

**File name:** `SKILL.md` (uppercase)
**Frontmatter fields:**
- `name` (optional): Unique identifier for the skill
- `description` (required): Clear explanation of what the skill does - the agent uses this for discovery

**Metadata Quality:** The `description` determines when the agent will use the skill. Be specific about what the skill does and when to use it. Use the third-person (e.g. "This skill should be used when..." instead of "Use this skill when...").

#### Bundled Resources (optional)

##### Scripts (`scripts/`)
Executable code for tasks that require deterministic reliability or are repeatedly rewritten.
- **When to include**: When the same code is being rewritten repeatedly or deterministic reliability is needed
- **Benefits**: Token efficient, deterministic, may be executed without loading into context

##### References (`references/`)
Documentation and reference material intended to be loaded as needed into context.
- **When to include**: For documentation that the agent should reference while working
- **Examples**: API documentation, database schemas, company policies, detailed workflow guides

##### Assets (`assets/`)
Files not intended to be loaded into context, but rather used within the output.
- **When to include**: When the skill needs files that will be used in the final output
- **Examples**: Templates, images, boilerplate code, fonts

---

## Skill Creation Process

### Step 1: Understanding the Skill with Concrete Examples

To create an effective skill, clearly understand concrete examples of how the skill will be used:
- "What functionality should the skill support?"
- "Can you give some examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"

### Step 2: Planning the Reusable Skill Contents

Analyze each example by:
1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful when executing these workflows repeatedly

### Step 3: Initializing the Skill

When creating a new skill from scratch, run the `init_skill.py` script:

```bash
python3 ~/.gemini/antigravity/skills/skill-creator/scripts/init_skill.py <skill-name> --path <output-directory>
```

The script:
- Creates the skill directory at the specified path
- Generates a SKILL.md template with proper frontmatter and TODO placeholders
- Creates example resource directories: `scripts/`, `references/`, and `assets/`

### Step 4: Edit the Skill

When editing the skill:
- Start with the reusable resources: `scripts/`, `references/`, and `assets/` files
- Delete any example files and directories not needed for the skill
- Update SKILL.md to document:
  1. What is the purpose of the skill
  2. When should the skill be used
  3. How should the agent use the skill

**Writing Style:** Write using **imperative/infinitive form** (verb-first instructions). Use objective, instructional language (e.g., "To accomplish X, do Y" rather than "You should do X").

### Step 5: Packaging a Skill

Once the skill is ready, package it into a distributable zip file:

```bash
python3 ~/.gemini/antigravity/skills/skill-creator/scripts/package_skill.py <path/to/skill-folder> [output-directory]
```

The packaging script will:
1. **Validate** the skill automatically (frontmatter, naming, structure)
2. **Package** the skill into a zip file if validation passes

### Step 6: Iterate

After testing the skill, users may request improvements. Use the skill on real tasks, notice struggles or inefficiencies, and update accordingly.
