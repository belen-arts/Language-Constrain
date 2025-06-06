What This Project Does
This simulation demonstrates how platform constraints (like character limits, simplified interfaces, and algorithmic content prioritization) affect human communication patterns and linguistic complexity in real-time.
Key Research Question: Do digital platform constraints reduce the complexity of human thought and expression?

Features
Live Reddit Interface: Full Reddit-style interface with posts, comments, and voting
AI Comment Generation: Generate comments in 3 different constraint modes:

Normal: Natural conversational language
Casual/Slang: Constrained to slang terms and emojis only
Academic: Sophisticated vocabulary and complex sentences


Real-Time Analytics: Floating panel shows linguistic impact metrics
Human Response Simulation: AI generates realistic human responses to constrained language

What You'll See
Vocabulary Diversity: How constraints reduce language complexity
Communication Breakdown: When constrained comments become incomprehensible
Platform Impact: Real-time evidence of how interface design affects cognition

Quick Start
Prerequisites

Node.js installed
Claude API key from Anthropic
-----
Setup
Clone this repository
Create .env file with your Claude API key:
CLAUDE_API_KEY=your_key_here

Install dependencies:
bashnpm install express cors dotenv

Start the server:
bashnode server.js

Open browser to http://localhost:3000
---------

How to Use
Browse the Reddit-style interface with real posts
Generate AI comments using the dropdown to select constraint levels
Watch the floating analytics panel update in real-time
Compare language complexity across different constraint modes
Observe human responses to constrained vs. unconstrained language

Research Applications
This simulation provides real-time evidence for research in:

Digital Humanities: Platform effects on human expression
Cognitive Science: External constraints on internal cognition
Technology Ethics: Do platforms reduce human intelligence?
Communication Studies: Platform-mediated discourse analysis
AI Research: Language model performance under constraints

Key Findings
The simulation demonstrates:

Measurable vocabulary reduction under platform constraints
Communication breakdown between constrained and unconstrained users
Real-time cognitive impact of platform design choices
AI amplification of constraint-based communication gaps

Files Structure
index.html - Frontend Reddit interface with floating analytics
server.js - Backend API with Claude integration and analytics tracking
reddit_posts.json - Real Reddit posts data (optional)
slang_data.json - Slang terms dataset (optional)

Technical Details
Frontend:  JavaScript, HTML5, CSS3
Backend: Node.js, Express
AI Integration: Claude API (Anthropic)
Analytics: Real-time constraint impact measurement
Data: Vocabulary diversity, emoji usage, comment length tracking

Research Impact
This tool provides the first real-time demonstration of how platform constraints immediately affect human cognitive expression, offering evidence for policy discussions about platform design and digital communication standards.
-----------------------
Note: This is a research tool designed to demonstrate platform constraint effects. Generate several comments with different constraint levels to see the full impact on communication patterns.
