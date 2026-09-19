# Bravura AI Core

BRAVURA AI — REAL WORKING BASE AI AGENT + EXACT UI/UX

IMPORTANT:

Build Bravura AI as a REAL WORKING BASE AI AGENT.

This is NOT just a static UI mockup.

I want two things in this first version:

1. The frontend must closely reproduce the attached Bravura AI reference image.

2. The application must contain a basic REAL AI agent that can receive a user prompt, reason about it, and return an actual AI-generated response.

However, keep the agent architecture intentionally SIMPLE and EXTENSIBLE.

I will export this project to VS Code later and manually build the advanced agent architecture.

==================================================

CORE REQUIREMENT

==================================================

Build a functional MVP of Bravura AI.

The user should be able to:

1. Open Bravura AI.

2. Type a prompt.

3. Select a mode.

4. Send the prompt.

5. The application sends the prompt to an LLM.

6. The LLM generates a real response.

7. The response appears in the Bravura AI chat/workspace.

8. The interface shows loading/thinking state while the AI is responding.

9. Conversation messages should be displayed properly.

10. The user should be able to continue the conversation.

This must actually work.

Do NOT create fake AI responses.

==================================================

LLM

==================================================

Use ONE LLM provider for the initial MVP.

Prefer a simple integration that can later be replaced or expanded.

Use:

Groq API

Design the code so the LLM provider can later be replaced with:

- Groq

- Anthropic

- Other providers can be added behind the provider boundary later.

- Open-source models

- Local models

Do NOT hardcode API keys into frontend source code.

Use environment variables / secure server-side handling.

Create an appropriate environment variable such as:

GROQ_API_KEY

Never expose the secret API key to the browser.

If Lovable's environment/backend architecture requires a server-side function, use that architecture.

==================================================

BASE AI AGENT

==================================================

The first version should implement a SIMPLE agent loop.

Architecture:

User Prompt

     ↓

Agent

     ↓

LLM

     ↓

Response

     ↓

User

The agent should have a basic system instruction establishing Bravura AI as an intelligent assistant.

The agent should be capable of:

- answering questions

- explaining concepts

- reasoning through problems

- generating text

- helping with coding questions

- planning tasks

- analyzing user-provided information

- maintaining conversation context

Do NOT build advanced autonomous behavior yet.

==================================================

AGENT MODES

==================================================

The UI should contain these modes:

Chat

Research

Create

Analyze

Code

Image

More

For the MVP:

Chat:

General-purpose AI assistant.

Research:

Use the same LLM but apply a research-oriented system instruction.

Create:

Creative generation.

Analyze:

Analytical reasoning.

Code:

Programming-focused assistant.

Image:

For now, display an appropriate "Image generation will be connected later" state if no image provider is configured.

More:

Display additional modes/options as UI.

IMPORTANT:

Modes must actually change the AI system instruction.

Do NOT merely change the visual selection.

==================================================

CONVERSATION MEMORY

==================================================

Implement basic conversation memory.

The current conversation should maintain:

- user messages

- assistant messages

Send relevant conversation history to the LLM so follow-up questions understand previous messages.

Example:

User:

"What is machine learning?"

AI:

Explanation.

User:

"Give me an example."

The AI should understand that "example" refers to machine learning.

Keep this memory simple.

I will later implement persistent memory/database/vector memory in VS Code.

==================================================

CHAT UI

==================================================

When the user sends a prompt, transition naturally from the landing screen into the conversation interface.

User message:

Display on the right or appropriate modern chat alignment.

Assistant response:

Display in a premium Bravura AI assistant message panel.

Include:

- Bravura orb/avatar

- response text

- markdown rendering

- code blocks

- copy button

- subtle hover states

Support:

- paragraphs

- headings

- lists

- code blocks

- inline code

- links

==================================================

STREAMING

==================================================

If supported by the selected Groq integration, implement streaming responses.

The user should see the response being generated progressively.

Show a subtle AI thinking/generating state.

Example:

Quench AI

Thinking...

Then progressively render the response.

Do NOT fake streaming.

If true streaming cannot be implemented in the chosen architecture, use a normal request/response flow rather than simulating fake streaming.

==================================================

PROMPT COMPOSER

==================================================

Recreate the prompt composer from the reference image.

Placeholder:

"Ask anything..."

Controls:

+

Search

Deep Think

Attach

Send button:

Glowing circular green/cyan button.

The composer should support:

- Enter → send

- Shift + Enter → newline

- disabled state while request is processing

- loading state

- error state

==================================================

QUICK ACTIONS

==================================================

Create:

Explain a concept

Plan something

Analyze data

Create something

Clicking a quick action should populate or submit an appropriate starter prompt.

==================================================

EXACT UI/UX

==================================================

The attached reference image is the PRIMARY visual reference.

Recreate the following visual characteristics closely:

- deep black space background

- subtle cosmic atmosphere

- large flowing cyan/blue/green curves

- futuristic Bravura AI orb

- premium dark UI

- glass-like panels

- thin luminous borders

- subtle green/cyan/blue gradients

- rounded corners

- clean futuristic typography

- strong spacing

- minimal clutter

Do NOT create a generic ChatGPT clone.

Bravura AI should have its own identity.

==================================================

DESKTOP STRUCTURE

==================================================

Use three major areas:

LEFT SIDEBAR

CENTRAL WORKSPACE

RIGHT CONTEXT PANEL

--------------------------------------------------

LEFT SIDEBAR

--------------------------------------------------

Logo:

BRAVURA AI

Navigation:

New Chat

Explore

Library

Agents

Tools

Projects

Integrations

Bottom:

Upgrade to Pro

User profile.

New Chat should actually start a new conversation.

Projects/Library/etc. can initially be basic UI placeholders.

--------------------------------------------------

CENTRAL WORKSPACE

--------------------------------------------------

Landing state:

"Let's build something incredible."

"incredible." should use a green → cyan → blue gradient.

Subtitle:

"Your ideas. Deeper answers."

Mode selector:

Chat

Research

Create

Analyze

Code

Image

More

Prompt composer.

Quick actions.

After sending a prompt:

Transition into the conversation interface while preserving the same visual language.

--------------------------------------------------

RIGHT PANEL

--------------------------------------------------

Create:

AI Online

Current Agent Run

Recent Projects

Bravura Core

The "Current Agent Run" panel should reflect REAL application state.

For example:

Idle

Thinking

Generating

Complete

Error

Do NOT display fake progress claiming that the AI is performing actions it is not actually performing.

The right panel should be designed so it can later display:

Planning

Tool execution

Research

Coding

Testing

Review

when I implement the advanced agent.

==================================================

BASE AGENT EXECUTION STATE

==================================================

Implement a simple real state machine:

IDLE

↓

THINKING

↓

GENERATING

↓

COMPLETE

If an error occurs:

ERROR

The UI should react to the real state.

Example:

When user sends prompt:

Current Agent Run

● Thinking

Then:

● Generating

Then:

✓ Complete

Again:

These states must correspond to the actual request lifecycle.

==================================================

ERROR HANDLING

==================================================

Implement proper error handling.

If:

- API key is missing

- API request fails

- rate limit occurs

- network fails

- invalid response occurs

show a clean user-friendly error.

Never expose secret keys.

Never expose raw sensitive server errors.

==================================================

SECURITY

==================================================

IMPORTANT:

Never put GROQ_API_KEY directly in React client-side code.

Use secure server-side environment handling.

Never commit secrets.

Create:

.env.example

with placeholder configuration.

Do not create a real secret.

==================================================

ARCHITECTURE

==================================================

Keep the initial architecture clean and extensible.

Recommended conceptual structure:

Frontend

    ↓

Agent API

    ↓

Base Agent

    ↓

LLM Provider

    ↓

Groq

Keep LLM-specific logic isolated from the UI.

For example, conceptually:

components/

services/

agent/

lib/

Do not tightly couple React components directly to Groq.

==================================================

FUTURE EXTENSIBILITY

==================================================

The architecture must make it easy for me to later add:

Multiple LLMs

Agent orchestration

Planner

Coder

Researcher

Debugger

Reviewer

Tool calling

Web search

GitHub

File operations

Terminal

Code execution

RAG

Vector database

Long-term memory

Supabase

Authentication

WebSockets

SSE

Human approval

Autonomous software engineering

DO NOT IMPLEMENT THESE ADVANCED FEATURES NOW.

Only create clean extension points.

==================================================

RESPONSIVE DESIGN

==================================================

The reference includes both desktop and mobile design.

Implement proper responsive behavior for:

320px

375px

390px

430px

768px

1024px

1280px

1366px

1440px

1920px

Mobile:

- collapsible sidebar

- compact top bar

- central workspace

- right panel becomes collapsible/bottom section

- responsive prompt composer

- responsive quick actions

- no horizontal scrolling

- no overlapping elements

==================================================

PERFORMANCE

==================================================

Keep the application lightweight.

Avoid unnecessary dependencies.

Avoid huge background images.

Prefer CSS/SVG for visual effects.

Do not install libraries unless actually required.

==================================================

COMPONENTS

==================================================

Use reusable components.

Suggested structure:

AppShell

Sidebar

TopBar

SearchBar

HeroSection

ModeSelector

PromptComposer

ChatView

ChatMessage

MarkdownRenderer

QuickActions

QuickActionCard

AgentStatus

AgentRunCard

RecentProjects

QuenchCoreCard

MobileNavigation

==================================================

IMPORTANT: DO NOT WASTE IMPLEMENTATION TIME

==================================================

Do NOT build:

❌ Advanced autonomous agent

❌ Multi-agent system

❌ GitHub automation

❌ Code execution sandbox

❌ Terminal execution

❌ Web browsing agent

❌ RAG

❌ Vector database

❌ Long-term memory

❌ Complex workflow engine

❌ Multiple LLM providers

❌ Image generation API

❌ Voice system

❌ Payment system

❌ Complex authentication

ONLY BUILD:

✅ Exact Bravura AI frontend

✅ Real Groq LLM connection

✅ Basic agent

✅ Basic conversation memory

✅ Real agent status

✅ Working prompt composer

✅ Working mode selection

✅ Markdown/code rendering

✅ Error handling

✅ Responsive UI

==================================================

FINAL OBJECTIVE

==================================================

The finished application should feel like:

BRAVURA AI

A real, functioning AI assistant with a premium futuristic interface.

It should NOT feel like:

- a static prototype

- a fake AI demo

- a generic dashboard

- a ChatGPT clone

The user must be able to open the application, type:

"Explain machine learning to me like I'm a beginner."

and receive a REAL response from Groq inside the Bravura AI interface.

Build the frontend and base AI agent now.

Keep the implementation clean so the entire project can later be exported to VS Code and significantly expanded manually.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3a7476f7-101f-4a32-ba0b-68deae0dcca0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
